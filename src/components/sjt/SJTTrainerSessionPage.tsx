import { useState, useCallback, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, ChevronRight, type LucideIcon } from "lucide-react";
import Header from "../layout/Header";
import Footer from "../layout/Footer";
import SEOHead from "../seo/SEOHead";
import UcatGuidesPanel from "../layout/UcatGuidesPanel";
import TrainerFaqSection from "../seo/TrainerFaqSection";
import SJTDomainBadge from "./SJTDomainBadge";
import SJTQuestionSkeleton from "./SJTQuestionSkeleton";
import { useSJTQuestionSession } from "../../hooks/useSJTQuestionSession";
import { trainerFaqs } from "../../data/trainerFaqs";
import { getSiteBaseUrl } from "../../lib/siteUrl";
import { cn } from "../../lib/cn";
import type { SJTQuestion, SJTQuestionType } from "../../types/sjt";

type Phase = "intro" | "quiz" | "between";

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
  renderQuiz: (question: SJTQuestion, onComplete: (score: number, max: number) => void) => ReactNode;
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

  const base = getSiteBaseUrl();
  const canonical = base ? `${base}${canonicalPath}` : undefined;
  const sessionPct = sessionMax > 0 ? Math.round((sessionScore / sessionMax) * 100) : null;

  useEffect(() => {
    if (phase === "between") {
      void prefetchNext();
    }
  }, [phase, prefetchNext]);

  const handleComplete = useCallback((score: number, max: number) => {
    setSessionScore((s) => s + score);
    setSessionMax((m) => m + max);
    setQuestionsAttempted((n) => n + 1);
    setLastScore({ score, max });
    setPhase("between");
  }, []);

  const handleNext = useCallback(async () => {
    setAdvancing(true);
    try {
      await advanceToNext();
      setPhase("quiz");
    } finally {
      setAdvancing(false);
    }
  }, [advanceToNext]);

  const handleReset = useCallback(() => {
    setSessionScore(0);
    setSessionMax(0);
    setQuestionsAttempted(0);
    setLastScore(null);
    setPhase("intro");
    resetSession();
  }, [resetSession]);

  const showIntroSkeleton = phase === "intro" && loading && !question;
  const noQuestions = !loading && !question && !error;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead title={seoTitle} description={seoDescription} canonicalUrl={canonical} />
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Icon className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            {questionsAttempted > 0 && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">{questionsAttempted} done</p>
                {sessionPct != null && (
                  <p className="text-sm font-bold text-foreground">{sessionPct}%</p>
                )}
              </div>
            )}
          </div>

          {question && phase !== "between" && (
            <div className="mb-4">
              <SJTDomainBadge domain={question.domain} showLink />
            </div>
          )}

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

          {phase === "quiz" && question && renderQuiz(question, handleComplete)}

          {phase === "between" && (
            <div className="space-y-5">
              {lastScore && (
                <div
                  className={cn(
                    "rounded-xl border p-5 text-center",
                    lastScore.score === lastScore.max
                      ? "bg-training-success-muted border-training-success"
                      : lastScore.score >= lastScore.max * 0.6
                        ? "bg-amber-50 border-amber-200"
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
