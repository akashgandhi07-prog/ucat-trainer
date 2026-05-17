import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, ChevronRight, type LucideIcon } from "lucide-react";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import SEOHead from "../seo/SEOHead";
import UcatGuidesPanel from "../layout/UcatGuidesPanel";
import TrainerFaqSection from "../seo/TrainerFaqSection";
import SJTDomainBadge from "./SJTDomainBadge";
import SJTQuestionSkeleton from "./SJTQuestionSkeleton";
import SJTPerformancePanel from "./SJTPerformancePanel";
import { useSJTQuestionSession } from "../../hooks/useSJTQuestionSession";
import { useAuth } from "../../hooks/useAuth";
import { trainerFaqs } from "../../data/trainerFaqs";
import { recordSJTAttempt } from "../../lib/sjtAnalytics";
import { persistSJTSession } from "../../lib/sjtSessionStorage";
import { getSiteBaseUrl } from "../../lib/siteUrl";
import { cn } from "../../lib/cn";
import type { SJTQuestion, SJTQuestionType, SJTQuizProgress } from "../../types/sjt";

type Phase = "intro" | "quiz" | "between";

export type SJTQuizHandlers = {
  onComplete: (score: number, max: number) => void;
  onProgress: (progress: SJTQuizProgress) => void;
};

type Props = {
  type: SJTQuestionType;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  faqId: string;
  emptyMessage: string;
  introContent: ReactNode;
  renderQuiz: (question: SJTQuestion, handlers: SJTQuizHandlers) => ReactNode;
};

export default function SJTTrainerSessionPage({
  type,
  icon: Icon,
  title,
  subtitle,
  seoTitle,
  seoDescription,
  canonicalPath,
  faqId,
  emptyMessage,
  introContent,
  renderQuiz,
}: Props) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const {
    question,
    loading,
    error,
    prefetchNext,
    advanceToNext,
    resetSession,
    retry,
  } = useSJTQuestionSession(type);

  const [sessionScore, setSessionScore] = useState(0);
  const [sessionMax, setSessionMax] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [lastScore, setLastScore] = useState<{ score: number; max: number } | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);

  const progressRef = useRef<SJTQuizProgress | null>(null);
  const savedQuestionIdRef = useRef<string | null>(null);
  const phaseRef = useRef(phase);
  const questionRef = useRef(question);
  const userIdRef = useRef(user?.id ?? null);

  phaseRef.current = phase;
  questionRef.current = question;
  userIdRef.current = user?.id ?? null;

  const base = getSiteBaseUrl();
  const canonical = base ? `${base}${canonicalPath}` : undefined;
  const sessionPct =
    sessionMax > 0
      ? Math.min(100, Math.round((sessionScore / sessionMax) * 100))
      : null;

  useEffect(() => {
    savedQuestionIdRef.current = null;
    progressRef.current = null;
  }, [question?.id]);

  useEffect(() => {
    if (phase === "between") {
      void prefetchNext();
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (phase === "quiz") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [phase, prefetchNext]);

  const flushPartialIfNeeded = useCallback(() => {
    const q = questionRef.current;
    if (phaseRef.current !== "quiz" || !q) return;
    if (savedQuestionIdRef.current === q.id) return;

    const progress = progressRef.current;
    if (!progress || progress.itemsAttempted <= 0) return;

    savedQuestionIdRef.current = q.id;
    const maxScore = progress.itemsTotal;

    recordSJTAttempt({
      questionId: q.id,
      domain: q.domain,
      type: q.type,
      score: progress.partialScore,
      maxScore,
    });
    void persistSJTSession(userIdRef.current, {
      question_id: q.id,
      question_type: q.type,
      domain: q.domain,
      score: progress.partialScore,
      max_score: maxScore,
      items_attempted: progress.itemsAttempted,
      items_total: maxScore,
      completed: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      flushPartialIfNeeded();
    };
  }, [flushPartialIfNeeded]);

  useEffect(() => {
    const onPageHide = () => flushPartialIfNeeded();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushPartialIfNeeded]);

  const handleProgress = useCallback((progress: SJTQuizProgress) => {
    progressRef.current = progress;
  }, []);

  const handleComplete = useCallback(
    (score: number, max: number) => {
      if (question) {
        savedQuestionIdRef.current = question.id;
        recordSJTAttempt({
          questionId: question.id,
          domain: question.domain,
          type: question.type,
          score,
          maxScore: max,
        });
        void persistSJTSession(user?.id ?? null, {
          question_id: question.id,
          question_type: question.type,
          domain: question.domain,
          score,
          max_score: max,
          items_attempted: max,
          items_total: max,
          completed: true,
        });
      }
      setSessionScore((s) => s + score);
      setSessionMax((m) => m + max);
      setQuestionsAttempted((n) => n + 1);
      setLastScore({ score, max });
      setPerformanceRefreshKey((key) => key + 1);
      setPhase("between");
    },
    [question, user?.id],
  );

  const handleNext = useCallback(async () => {
    setAdvancing(true);
    try {
      await advanceToNext();
      savedQuestionIdRef.current = null;
      progressRef.current = null;
      setPhase("quiz");
    } finally {
      setAdvancing(false);
    }
  }, [advanceToNext]);

  const handleReset = useCallback(() => {
    flushPartialIfNeeded();
    setSessionScore(0);
    setSessionMax(0);
    setQuestionsAttempted(0);
    setLastScore(null);
    savedQuestionIdRef.current = null;
    progressRef.current = null;
    setPhase("intro");
    resetSession();
  }, [resetSession, flushPartialIfNeeded]);

  const showIntroSkeleton = phase === "intro" && loading && !question;
  const noQuestions = !loading && !question && !error;

  const quizHandlers: SJTQuizHandlers = {
    onComplete: handleComplete,
    onProgress: handleProgress,
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonicalUrl={canonical} />
      <Header />
      <main className="flex-1 py-5 sm:py-6 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              {question && phase !== "between" && (
                <SJTDomainBadge domain={question.domain} showLink />
              )}
              {questionsAttempted > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{questionsAttempted} done</p>
                  {sessionPct != null && (
                    <p className="text-sm font-bold text-foreground">{sessionPct}%</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive-muted p-4 text-sm text-foreground">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {phase === "intro" && (
            <div className="space-y-5">
              {introContent}
              {showIntroSkeleton && <SJTQuestionSkeleton />}
              {noQuestions && !error && (
                <p className="text-sm text-muted-foreground text-center">{emptyMessage}</p>
              )}
              {question && !showIntroSkeleton && (
                <button
                  type="button"
                  onClick={() => setPhase("quiz")}
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Start practising
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              )}
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-muted-foreground hover:text-primary">
                  Back to SJT hub
                </Link>
              </p>
            </div>
          )}

          {phase === "quiz" && question && renderQuiz(question, quizHandlers)}

          {phase === "between" && (
            <div className="space-y-5 max-w-xl mx-auto">
              {lastScore && (
                <div
                  className={cn(
                    "rounded-xl border p-5 text-center",
                    lastScore.score === lastScore.max
                      ? "bg-training-success-muted border-training-success"
                      : lastScore.score >= lastScore.max * 0.6
                        ? "bg-warning-muted border-warning"
                        : "bg-destructive-muted border-destructive",
                  )}
                >
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {lastScore.score} / {lastScore.max}
                  </p>
                  <p className="text-sm text-muted-foreground">on this scenario</p>
                  {sessionPct != null && questionsAttempted > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Session total: {sessionScore} / {sessionMax} ({sessionPct}%) across{" "}
                      {questionsAttempted} scenarios
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center px-2">
                Completed scenarios sync to your dashboard when you are signed in. If you leave
                mid-scenario, partial progress is saved too.
              </p>
              {advancing && <SJTQuestionSkeleton />}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  disabled={advancing}
                  className="flex-1 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Next scenario
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 min-h-[44px] rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  Reset session
                </button>
              </div>
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Domain performance
                </p>
                <SJTPerformancePanel
                  refreshKey={performanceRefreshKey}
                  onClear={() => setPerformanceRefreshKey((key) => key + 1)}
                />
              </div>
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-muted-foreground hover:text-primary">
                  Back to SJT hub
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>
      <UcatGuidesPanel embedded context="sjtHub" />
      <TrainerFaqSection
        embedded
        id={faqId}
        title="Common questions about the UCAT SJT"
        intro="Frequently asked questions about the Situational Judgement Test: how it works, how it's scored, and how to approach each question type using GMC Good Medical Practice."
        faqs={trainerFaqs.sjtHub}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
