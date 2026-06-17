import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { fetchNextInferencePassageId } from "../lib/inferenceApi";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import InferenceSessionHeader from "../components/inference/InferenceSessionHeader";
import InferenceQuiz from "../components/inference/InferenceQuiz";
import InferenceResultsView from "../components/inference/InferenceResultsView";
import { useAuth } from "../hooks/useAuth";
import type { Passage } from "../data/passages";
import { PASSAGES } from "../data/passages";
import { getInferenceQuestionsForPassage, PASSAGE_IDS_WITH_INFERENCE } from "../data/inferenceQuestions";
import type { InferenceQuestion, InferenceBreakdownItem } from "../types/inference";
import { appendGuestSession } from "../lib/guestSessions";
import { newClientSessionId, upsertTrainerSession } from "../lib/trainerSessionLog";
import type { TrainerSessionUpsert } from "../lib/trainerSessionLog";
import { supabaseLog } from "../lib/logger";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import { getSiteBaseUrl } from "../lib/siteUrl";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import { trainerFaqs } from "../data/trainerFaqs";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";

type Phase = "active" | "results";

// Timed mode: 60 seconds per question with auto-submit. Defaults to ON; the
// student's choice persists across visits in localStorage.
const TIMED_MODE_STORAGE_KEY = "inference_timed_mode";

function readStoredTimedMode(): boolean {
  try {
    return localStorage.getItem(TIMED_MODE_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

type LocationState = {
  trainingType: "inference_trainer";
  passage: Passage;
  difficulty?: TrainingDifficulty;
};

function scrollTrainerToTop() {
  document.getElementById("app-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
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
  const [timedMode, setTimedMode] = useState<boolean>(() => readStoredTimedMode());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasAutoSavedRef = useRef(false);
  // Initialised in a mount effect below: impure calls aren't allowed during render.
  const sessionIdRef = useRef("");
  const mountedRef = useRef(true);
  const startTimeRef = useRef<number>(0);
  const passagePickAbortRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  // Captures latest values for use in pagehide/unmount handlers (avoids stale closures).
  const latestRef = useRef({
    runningCorrect,
    runningTotal,
    phase,
    elapsedSeconds,
    user,
    difficulty,
    passageId: passage?.id ?? null,
  });
  const savedOnExitRef = useRef(false);

  /**
   * Picks the next passage using DB-backed history (authenticated users) or the
   * local random picker (anon / network failure). Updates `passage` state.
   */
  const pickAndSetNextPassage = useCallback(
    (currentId?: string | null) => {
      passagePickAbortRef.current?.abort();
      const controller = new AbortController();
      passagePickAbortRef.current = controller;

      fetchNextInferencePassageId(currentId, controller.signal)
        .then((nextId) => {
          if (controller.signal.aborted) return;
          if (nextId) {
            const found = PASSAGES.find((p) => p.id === nextId) ?? null;
            if (found) {
              setPassage(found);
              return;
            }
          }
          // Fallback: local random picker
          setPassage(pickPassageWithInference(currentId, difficulty));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setPassage(pickPassageWithInference(currentId, difficulty));
        });
    },
    [difficulty],
  );

  const questions: InferenceQuestion[] =
    passage != null
      ? getInferenceQuestionsForPassage(passage.id, passage.text)
      : [];
  const effectiveQuestionCount = questions.length;

  useEffect(() => {
    mountedRef.current = true;
    if (!sessionIdRef.current) sessionIdRef.current = newClientSessionId();
    if (!startTimeRef.current) startTimeRef.current = Date.now();
    return () => {
      mountedRef.current = false;
      passagePickAbortRef.current?.abort();
    };
  }, []);

  // Keep latestRef current after every render so the exit handler always reads fresh values.
  useEffect(() => {
    latestRef.current = {
      runningCorrect,
      runningTotal,
      phase,
      elapsedSeconds,
      user,
      difficulty,
      passageId: passage?.id ?? null,
    };
  });

  // Autosave running progress on tab close or SPA navigation away (e.g. back to hub).
  // Only fires when in the active phase with at least one completed passage.
  useEffect(() => {
    const saveOnExit = () => {
      if (savedOnExitRef.current) return;
      const { phase: p, runningTotal: total, runningCorrect: correct, elapsedSeconds: elapsed, user: u, difficulty: diff, passageId } = latestRef.current;
      if (p !== "active" || total <= 0) return;
      savedOnExitRef.current = true;
      if (u) {
        void upsertTrainerSession(u.id, sessionIdRef.current, {
          training_type: "inference_trainer",
          difficulty: diff,
          wpm: null,
          correct,
          total,
          passage_id: passageId,
          time_seconds: elapsed,
        });
      } else {
        appendGuestSession({
          training_type: "inference_trainer",
          difficulty: diff,
          wpm: null,
          correct,
          total,
          time_seconds: elapsed,
          client_session_id: sessionIdRef.current,
        });
      }
    };

    window.addEventListener("pagehide", saveOnExit);
    return () => {
      window.removeEventListener("pagehide", saveOnExit);
      saveOnExit(); // covers SPA navigation (component unmounts without pagehide)
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
        pickAndSetNextPassage(passage?.id ?? null);
        setQuizKey((k) => k + 1);
      }
    },
    [passage, pickAndSetNextPassage]
  );

  const handleToggleTimedMode = useCallback(() => {
    setTimedMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TIMED_MODE_STORAGE_KEY, next ? "on" : "off");
      } catch {
        /* localStorage unavailable; the toggle still works for this visit */
      }
      return next;
    });
  }, []);

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
          client_session_id: sessionIdRef.current,
        });
        return;
      }
      setSaveError(null);
      setSaving(true);
      const payload: TrainerSessionUpsert = {
        training_type: "inference_trainer",
        difficulty,
        wpm: null,
        correct: correctToSave,
        total: totalToSave,
        passage_id: passage?.id ?? null,
        time_seconds: elapsedSeconds,
      };
      const saved = await upsertTrainerSession(user.id, sessionIdRef.current, payload);
      if (saved) {
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
          sessionIdRef.current = newClientSessionId();
          savedOnExitRef.current = false;
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
          pickAndSetNextPassage(passage?.id ?? null);
        }
      } else {
        if (!mountedRef.current) return;
        setSaveError(getSessionSaveErrorMessage(null));
      }
      if (mountedRef.current) setSaving(false);
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
      pickAndSetNextPassage,
    ]
  );

  const handleRestart = useCallback(() => {
    hasAutoSavedRef.current = false;
    sessionIdRef.current = newClientSessionId();
    savedOnExitRef.current = false;
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
    pickAndSetNextPassage(passage?.id ?? null);
  }, [difficulty, passage?.id, pickAndSetNextPassage]);

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-save on entering results; guarded by hasAutoSavedRef
      handleSaveProgress({ skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "inference_trainer",
        difficulty,
        wpm: null,
        correct: runningCorrect,
        total: runningTotal,
        time_seconds: elapsedSeconds,
        client_session_id: sessionIdRef.current,
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
            <p className="text-muted-foreground mb-4">
              No inference questions for this passage. Try another.
            </p>
            <button
              type="button"
              onClick={() => pickAndSetNextPassage(passage.id)}
              className="min-h-[44px] px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Try another passage
            </button>
            <div className="mt-4">
              <Link to="/" className="text-muted-foreground hover:text-primary">
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
    <div className="flex flex-col min-h-screen bg-secondary/50">
      <SEOHead
        title="UCAT Inference Trainer (UK)"
        description="Practice selecting evidence for inferences in UCAT Verbal Reasoning. Free inference trainer for UK applicants from TheUKCATPeople."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-foreground font-medium rounded-lg ring-2 ring-primary opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto"
      >
        Skip to main content
      </a>
      <Header />

      {phase === "active" && (
        <>
          <div className="px-4 pt-4">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <BreadcrumbNav items={breadcrumbs} />
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={timedMode}
                  onChange={handleToggleTimedMode}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Timed mode (60s per question)
              </label>
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
              timedMode={timedMode}
              onComplete={handleQuizComplete}
              onNextQuestion={handleNextQuestion}
              onProgressChange={handleProgressChange}
              onBreakdownChange={handleBreakdownChange}
              trainerType="inference_trainer"
              passageId={passage.id}
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

      <UcatGuidesPanel context="trainer" trainingType="inference_trainer" contentMaxWidthClass="max-w-6xl mx-auto w-full" />
      <TrainerFaqSection
        id="inference-faq"
        title="Common questions about the UCAT inference trainer"
        intro="Answers to common questions about tackling inference-style Verbal Reasoning items and using this trainer to build strict, text-based reasoning for the UCAT."
        faqs={trainerFaqs.inference}
        collapseIntoSingleAccordion
      />

      <Footer />
    </div>
  );
}
