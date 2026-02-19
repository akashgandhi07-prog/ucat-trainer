import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import InferenceSessionHeader from "../components/inference/InferenceSessionHeader";
import InferenceQuiz from "../components/inference/InferenceQuiz";
import InferenceResultsView from "../components/inference/InferenceResultsView";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import type { Passage } from "../data/passages";
import { PASSAGES } from "../data/passages";
import { getInferenceQuestionsForPassage, PASSAGE_IDS_WITH_INFERENCE } from "../data/inferenceQuestions";
import type { InferenceQuestion, InferenceBreakdownItem } from "../types/inference";
import type { SessionInsertPayload } from "../types/session";
import { appendGuestSession } from "../lib/guestSessions";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { withRetry } from "../lib/retry";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import { getSiteBaseUrl } from "../lib/siteUrl";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import { trainerFaqs } from "../data/trainerFaqs";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";

type Phase = "active" | "results";

type LocationState = {
  trainingType: "inference_trainer";
  passage: Passage;
  difficulty?: TrainingDifficulty;
};

function scrollTrainerToTop() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function pickPassageWithInference(
  currentId?: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future difficulty filtering
  _difficulty?: TrainingDifficulty
): Passage | null {
  const candidates = PASSAGES.filter((p) =>
    PASSAGE_IDS_WITH_INFERENCE.includes(p.id)
  );
  if (candidates.length === 0) return PASSAGES[0] ?? null;
  const filtered =
    currentId != null
      ? candidates.filter((p) => p.id !== currentId)
      : candidates;
  const pool = filtered.length > 0 ? filtered : candidates;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export default function InferenceTrainerPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const difficulty: TrainingDifficulty = state?.difficulty ?? "medium";

  const [phase, setPhase] = useState<Phase>("active");
  const [passage, setPassage] = useState<Passage | null>(
    () => state?.passage ?? pickPassageWithInference(null, difficulty)
  );
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionBreakdown, setQuestionBreakdown] = useState<
    InferenceBreakdownItem[]
  >([]);
  const [runningCorrect, setRunningCorrect] = useState(0);
  const [runningTotal, setRunningTotal] = useState(0);
  const [runningBreakdown, setRunningBreakdown] = useState<
    InferenceBreakdownItem[]
  >([]);
  const [quizKey, setQuizKey] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasAutoSavedRef = useRef(false);
  const mountedRef = useRef(true);
  const startTimeRef = useRef<number>(Date.now());
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  const questions: InferenceQuestion[] =
    passage != null
      ? getInferenceQuestionsForPassage(passage.id, passage.text)
      : [];
  const effectiveQuestionCount = questions.length;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (phase === "active") {
      trackEvent("trainer_started", {
        training_type: "inference_trainer",
        difficulty,
        passage_id: passage?.id ?? null,
        question_count: effectiveQuestionCount,
      });
      setActiveTrainer("inference_trainer", "active");
    } else if (phase === "results") {
      clearActiveTrainer();
    }
  }, [phase, difficulty, passage?.id, effectiveQuestionCount]);

  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleProgressChange = useCallback(
    (correct: number, total: number, idx: number) => {
      setQuizCorrect(correct);
      setQuizTotal(total);
      setCurrentIndex(idx);
    },
    []
  );

  const handleBreakdownChange = useCallback((breakdown: InferenceBreakdownItem[]) => {
    setQuestionBreakdown(breakdown);
  }, []);

  const handleQuizComplete = useCallback(
    (correct: number, total: number, breakdown: InferenceBreakdownItem[]) => {
      setQuizCorrect(correct);
      setQuizTotal(total);
      setQuestionBreakdown(breakdown);
      setPhase("results");
    },
    []
  );

  const handleNextQuestion = useCallback(
    (correct: number, total: number, breakdown: InferenceBreakdownItem[]) => {
      setRunningCorrect((c) => c + correct);
      setRunningTotal((t) => t + total);
      setRunningBreakdown((b) => [...b, ...breakdown]);
      scrollTrainerToTop();
      const stayOnSamePassage = Math.random() < 0.5;
      if (stayOnSamePassage && passage) {
        setQuizKey((k) => k + 1);
      } else {
        setPassage((p) =>
          pickPassageWithInference(p?.id ?? null, difficulty)
        );
        setQuizKey((k) => k + 1);
      }
    },
    [difficulty, passage]
  );

  const handleEndSession = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

  const handleConfirmEnd = useCallback(() => {
    setShowEndConfirm(false);
    setRunningCorrect((c) => c + quizCorrect);
    setRunningTotal((t) => t + quizTotal);
    setRunningBreakdown((b) => [...b, ...questionBreakdown]);
    setPhase("results");
  }, [quizCorrect, quizTotal, questionBreakdown]);

  const handleCancelEnd = useCallback(() => {
    setShowEndConfirm(false);
  }, []);

  const handleSaveProgress = useCallback(
    async (opts?: { skipRestart?: boolean }) => {
      const correctToSave = phase === "results" ? runningCorrect : quizCorrect;
      const totalToSave = phase === "results" ? runningTotal : quizTotal;
      if (!user) {
        appendGuestSession({
          training_type: "inference_trainer",
          difficulty,
          wpm: null,
          correct: correctToSave,
          total: totalToSave,
          time_seconds: elapsedSeconds,
        });
        openAuthModal();
        return;
      }
      setSaveError(null);
      setSaving(true);
      const payload: SessionInsertPayload = {
        user_id: user.id,
        training_type: "inference_trainer",
        difficulty,
        wpm: null,
        correct: correctToSave,
        total: totalToSave,
        passage_id: passage?.id ?? null,
        time_seconds: elapsedSeconds,
      };
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("sessions").insert(payload);
          if (error) throw error;
        });
        supabaseLog.info("Inference trainer session saved", {
          userId: user.id,
          correct: quizCorrect,
          total: quizTotal,
        });
        trackEvent("trainer_completed", { training_type: "inference_trainer", difficulty });
        clearActiveTrainer();
        if (!mountedRef.current) return;
        setSaveError(null);
        if (!opts?.skipRestart) {
          setPhase("active");
          setQuizCorrect(0);
          setQuizTotal(0);
          setQuestionBreakdown([]);
          setRunningCorrect(0);
          setRunningTotal(0);
          setRunningBreakdown([]);
          setQuizKey((k) => k + 1);
          setCurrentIndex(0);
          startTimeRef.current = Date.now();
          setElapsedSeconds(0);
          setPassage((p) => pickPassageWithInference(p?.id ?? null, difficulty));
        }
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Unknown error";
        supabaseLog.error("Failed to save inference_trainer session", {
          message,
          userId: user.id,
        });
        if (!mountedRef.current) return;
        setSaveError(getSessionSaveErrorMessage(err));
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [
      user,
      phase,
      runningCorrect,
      runningTotal,
      quizCorrect,
      quizTotal,
      passage?.id,
      difficulty,
      elapsedSeconds,
      openAuthModal,
    ]
  );

  const handleRestart = useCallback(() => {
    hasAutoSavedRef.current = false;
    setPhase("active");
    setQuizCorrect(0);
    setQuizTotal(0);
    setQuestionBreakdown([]);
    setRunningCorrect(0);
    setRunningTotal(0);
    setRunningBreakdown([]);
    setQuizKey((k) => k + 1);
    setCurrentIndex(0);
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setPassage((p) => pickPassageWithInference(p?.id ?? null, difficulty));
  }, [difficulty]);

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      handleSaveProgress({ skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "inference_trainer",
        difficulty,
        wpm: null,
        correct: runningCorrect,
        total: runningTotal,
        time_seconds: elapsedSeconds,
      });
    }
  }, [
    phase,
    user,
    handleSaveProgress,
    runningCorrect,
    runningTotal,
    elapsedSeconds,
    difficulty,
  ]);


  if (!passage) {
    return <Navigate to="/?mode=inference_trainer" replace />;
  }

  if (effectiveQuestionCount === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="text-center">
            <p className="text-slate-600 mb-4">
              No inference questions for this passage. Try another.
            </p>
            <button
              type="button"
              onClick={() =>
                setPassage(pickPassageWithInference(passage.id, difficulty))
              }
              className="min-h-[44px] px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Try another passage
            </button>
            <div className="mt-4">
              <Link to="/" className="text-slate-500 hover:text-blue-600">
                Back to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-inference-trainer` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Verbal Reasoning", url: `${base}/ucat-verbal-reasoning-practice` },
        { name: "Inference", url: `${base}/ucat-inference-trainer` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <SEOHead
        title="UCAT Inference Trainer"
        description="Practice identifying evidence that supports inferences in UCAT Verbal Reasoning. Select the relevant text from passages."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto"
      >
        Skip to main content
      </a>
      <Header />

      {phase === "active" && (
        <>
          <div className="px-4 pt-4">
            <div className="max-w-5xl mx-auto">
              <BreadcrumbNav items={breadcrumbs} />
            </div>
          </div>
          <InferenceSessionHeader
            elapsedSeconds={elapsedSeconds}
            correct={runningCorrect + quizCorrect}
            total={runningTotal + quizTotal}
            currentIndex={currentIndex}
            questionCount={effectiveQuestionCount}
            onEndSession={handleEndSession}
            showEndConfirm={showEndConfirm}
            onConfirmEnd={handleConfirmEnd}
            onCancelEnd={handleCancelEnd}
          />
          <main
            id="main-content"
            className="flex-1 py-6 px-4"
            tabIndex={-1}
          >
            <InferenceQuiz
              key={`${passage.id}-${quizKey}`}
              passageText={passage.text}
              questions={questions}
              onComplete={handleQuizComplete}
              onNextQuestion={handleNextQuestion}
              onProgressChange={handleProgressChange}
              onBreakdownChange={handleBreakdownChange}
            />
          </main>
        </>
      )}

      {phase === "results" && (
        <main id="main-content" className="flex-1 py-12 px-4" tabIndex={-1}>
          <InferenceResultsView
            correct={runningCorrect}
            total={runningTotal}
            timeSeconds={elapsedSeconds}
            passageTitle={passage.title}
            passageText={passage.text}
            breakdown={runningBreakdown}
            onRestart={handleRestart}
            saveError={saveError}
            saving={saving}
          />
        </main>
      )}

      <TrainerFaqSection
        id="inference-faq"
        title="Common questions about the UCAT inference trainer"
        intro="Answers to common questions about tackling inference-style Verbal Reasoning items and using this trainer to build strict, text-based reasoning for the UCAT."
        faqs={trainerFaqs.inference}
      />

      <Footer />
    </div>
  );
}
