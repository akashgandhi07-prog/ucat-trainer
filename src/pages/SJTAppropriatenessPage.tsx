import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Scale, RotateCcw, ChevronRight } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SEOHead from "../components/seo/SEOHead";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import SJTRatingQuiz from "../components/sjt/SJTRatingQuiz";
import SJTDomainBadge from "../components/sjt/SJTDomainBadge";
import { pickRandomSJTQuestion } from "../data/sjtQuestions";
import type { SJTRatingQuestion } from "../types/sjt";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { cn } from "../lib/cn";

type Phase = "intro" | "quiz" | "between";

function pickQuestion(excludeId?: string | null): SJTRatingQuestion | null {
  return pickRandomSJTQuestion("appropriateness", excludeId) as SJTRatingQuestion | null;
}

export default function SJTAppropriatenessPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [question, setQuestion] = useState<SJTRatingQuestion | null>(() => pickQuestion());
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionMax, setSessionMax] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [lastScore, setLastScore] = useState<{ score: number; max: number } | null>(null);

  const base = getSiteBaseUrl();
  const canonical = base ? `${base}/ucat-sjt-appropriateness-trainer` : undefined;

  const handleComplete = useCallback((score: number, max: number) => {
    setSessionScore((s) => s + score);
    setSessionMax((m) => m + max);
    setQuestionsAttempted((n) => n + 1);
    setLastScore({ score, max });
    setPhase("between");
  }, []);

  const handleNext = useCallback(() => {
    const next = pickQuestion(question?.id);
    setQuestion(next);
    setPhase("quiz");
  }, [question?.id]);

  const handleReset = useCallback(() => {
    setSessionScore(0);
    setSessionMax(0);
    setQuestionsAttempted(0);
    setLastScore(null);
    setQuestion(pickQuestion());
    setPhase("intro");
  }, []);

  const sessionPct = sessionMax > 0 ? Math.round((sessionScore / sessionMax) * 100) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead
        title="UCAT SJT appropriateness trainer (UK)"
        description="Practice rating responses as Very Appropriate, Appropriate, Inappropriate or Very Inappropriate. Free UCAT SJT trainer grounded in GMC Good Medical Practice."
        canonicalUrl={canonical}
      />
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="w-full max-w-4xl mx-auto">

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Scale className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Appropriateness Rater</h1>
              <p className="text-xs text-muted-foreground">
                Rate each response on a 4-point scale. Partial credit for adjacent answers.
              </p>
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

          {phase === "intro" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground mb-3">How this trainer works</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. You will be presented with a clinical or training scenario.</p>
                  <p>2. Rate each listed response as <strong className="text-foreground">Very Appropriate</strong>, <strong className="text-foreground">Appropriate</strong>, <strong className="text-foreground">Inappropriate</strong>, or <strong className="text-foreground">Very Inappropriate</strong>.</p>
                  <p>3. After confirming each answer, you will see the correct rating with a full rationale and an explanation of why the adjacent option falls short.</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-secondary p-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scoring</p>
                <p className="text-sm text-foreground">
                  Full marks for the exact correct rating. Partial credit if you are one step away. No credit for two or more steps off.
                </p>
              </div>
              {question ? (
                <button
                  type="button"
                  onClick={() => setPhase("quiz")}
                  className="w-full min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  Start practising
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              ) : (
                <p className="text-sm text-muted-foreground text-center">No appropriateness questions available yet.</p>
              )}
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-muted-foreground hover:text-primary">
                  Back to SJT hub
                </Link>
              </p>
            </div>
          )}

          {phase === "quiz" && question && (
            <SJTRatingQuiz key={question.id} question={question} onComplete={handleComplete} />
          )}

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
                      : "bg-destructive-muted border-destructive"
                  )}
                >
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {lastScore.score} / {lastScore.max}
                  </p>
                  <p className="text-sm text-muted-foreground">on this scenario</p>
                  {sessionPct != null && questionsAttempted > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Session total: {sessionScore} / {sessionMax} ({sessionPct}%) across {questionsAttempted} scenarios
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
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
        id="sjt-appropriateness-faq"
        title="Common questions about the UCAT SJT"
        intro="Frequently asked questions about the Situational Judgement Test: how it works, how it's scored, and how to approach each question type using GMC Good Medical Practice."
        faqs={trainerFaqs.sjtHub}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
