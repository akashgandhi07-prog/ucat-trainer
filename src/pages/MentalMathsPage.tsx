import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { MentalMathsEngine } from "../components/mentalMaths/MentalMathsEngine";
import { difficultyFromStageIndex } from "../components/mentalMaths/mentalMathsStages";
import { SKILL_TEACHING } from "../data/teaching";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";
import { TRAINING_TYPE_LABELS } from "../types/training";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import { saveMentalMathsSession } from "../utils/analyticsStorage";
import { appendGuestSession } from "../lib/guestSessions";
import type { MentalMathsSummaryStats } from "../hooks/useMentalMathsLogic";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";

const teaching = SKILL_TEACHING.mental_maths;

export default function MentalMathsPage() {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: "mental_maths",
      pathname: "/train/mentalMaths",
    });
  }, []);

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/train/mentalMaths` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Quantitative Reasoning", url: `${base}/quantitative` },
        { name: "Mental Maths", url: `${base}/train/mentalMaths` },
      ]
    : undefined;

  const handleSessionComplete = useCallback(
    (stats: MentalMathsSummaryStats) => {
      clearActiveTrainer();
      if (user) {
        saveMentalMathsSession(stats, user.id);
      } else {
        appendGuestSession({
          training_type: "mental_maths",
          difficulty: difficultyFromStageIndex(stats.stageIndex),
          wpm: Math.round(stats.avgTimeMs),
          correct: stats.correct,
          total: stats.total,
          time_seconds: Math.round((stats.avgTimeMs * stats.total) / 1000) || 1,
        });
        openAuthModal();
      }
    },
    [user, openAuthModal]
  );

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <SEOHead
        title="UCAT Mental Maths Trainer"
        description="Build speed and accuracy in mental arithmetic for UCAT Quantitative Reasoning. Timed stages with progress tracking."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {TRAINING_TYPE_LABELS.mental_maths}
            </h1>
            <p className="mt-1 text-muted-foreground">{teaching.why}</p>
            <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {teaching.howToUse.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <MentalMathsEngine
              onSessionComplete={handleSessionComplete}
              onStageStart={(stageIndex) => setActiveTrainer("mental_maths", `stage_${stageIndex + 1}`)}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
