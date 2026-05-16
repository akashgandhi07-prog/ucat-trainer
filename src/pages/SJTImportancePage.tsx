import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Star, RotateCcw, ChevronRight } from "lucide-react";
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
  return pickRandomSJTQuestion("importance", excludeId) as SJTRatingQuestion | null;
}

export default function SJTImportancePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [question, setQuestion] = useState<SJTRatingQuestion | null>(() => pickQuestion());
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionMax, setSessionMax] = useState(0);
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [lastScore, setLastScore] = useState<{ score: number; max: number } | null>(null);

  const base = getSiteBaseUrl();
  const canonical = base ? `${base}/ucat-sjt-importance-trainer` : undefined;

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
        title="UCAT SJT importance trainer (UK)"
        description="Practice rating considerations as Very Important, Important, Of Minor Importance or Not Important at All. Free UCAT SJT trainer grounded in GMC Good Medical Practice."
        canonicalUrl={canonical}
      />
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="w-full max-w-2xl mx-auto">

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Star className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Importance Rater</h1>
              <p className="text-xs text-slate-500">
                Rate each consideration on a 4-point scale · Partial credit for adjacent answers
              </p>
            </div>
            {questionsAttempted > 0 && (
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-500">{questionsAttempted} done</p>
                {sessionPct != null && (
                  <p className="text-sm font-bold text-slate-700">{sessionPct}%</p>
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
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">How this trainer works</h2>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>1. You will be presented with a clinical or training scenario.</p>
                  <p>2. Rate each listed consideration as <strong>Very Important</strong>, <strong>Important</strong>, <strong>Of Minor Importance</strong>, or <strong>Not Important at All</strong>.</p>
                  <p>3. After submitting, you will see why each consideration sits at the rating it does — and why the alternatives fall short.</p>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Key pattern to spot</p>
                <p className="text-sm text-blue-800">
                  Patient safety and core professional duties almost always sit at Very Important. Personal feelings, reputation, and convenience almost always sit at Not Important at All or Of Minor Importance.
                </p>
              </div>
              {question ? (
                <button
                  type="button"
                  onClick={() => setPhase("quiz")}
                  className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
                >
                  Start practising
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              ) : (
                <p className="text-sm text-slate-500 text-center">No importance questions available yet.</p>
              )}
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-slate-500 hover:text-blue-600">
                  ← Back to SJT hub
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
                      ? "border-emerald-200 bg-emerald-50"
                      : lastScore.score >= lastScore.max * 0.6
                      ? "border-amber-200 bg-amber-50"
                      : "border-red-200 bg-red-50"
                  )}
                >
                  <p className="text-2xl font-bold text-slate-900 mb-1">
                    {lastScore.score} / {lastScore.max}
                  </p>
                  <p className="text-sm text-slate-600">on this scenario</p>
                  {sessionPct != null && questionsAttempted > 1 && (
                    <p className="text-xs text-slate-500 mt-2">
                      Session total: {sessionScore} / {sessionMax} ({sessionPct}%) across {questionsAttempted} scenarios
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
                >
                  Next scenario
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  Reset session
                </button>
              </div>
              <p className="text-center text-sm">
                <Link to="/ucat-sjt-practice" className="text-slate-500 hover:text-blue-600">
                  ← Back to SJT hub
                </Link>
              </p>
            </div>
          )}

        </div>
      </main>
      <UcatGuidesPanel context="sjtHub" />
      <TrainerFaqSection
        id="sjt-importance-faq"
        title="Common questions about the UCAT SJT"
        intro="Frequently asked questions about the Situational Judgement Test — how it works, how it's scored, and how to approach each question type using GMC Good Medical Practice."
        faqs={trainerFaqs.sjtHub}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
