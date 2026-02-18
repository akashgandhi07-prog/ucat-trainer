import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ReaderEngine from "../components/reader/ReaderEngine";
import DistortionQuiz from "../components/quiz/DistortionQuiz";
import ResultsView from "../components/quiz/ResultsView";
import type { QuestionBreakdownItem } from "../components/quiz/DistortionQuiz";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import type { Passage } from "../data/passages";
import SEOHead from "../components/seo/SEOHead";
import type { SessionInsertPayload } from "../types/session";
import { appendGuestSession } from "../lib/guestSessions";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { withRetry } from "../lib/retry";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import { pickNewRandomPassage } from "../lib/passages";
import { getSiteBaseUrl } from "../lib/siteUrl";
import {
  clampChunkSize,
  getSuggestedChunkSize,
  loadGuidedChunkingPrefs,
  saveGuidedChunkingPrefs,
} from "../lib/guidedChunkingPreferences";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";

type Phase = "reading" | "quiz" | "results";

type ConfigureState = {
  trainingType: "speed_reading";
  passageId: string;
  passage: Passage;
  wpm: number;
  questionCount?: number;
  difficulty?: TrainingDifficulty;
   guidedChunkingEnabled?: boolean;
   guidedChunkSize?: number;
};

export default function ReaderPage() {
  const location = useLocation();
  const configureState = location.state as ConfigureState | null;
  const [phase, setPhase] = useState<Phase>("reading");
  const [readingKey, setReadingKey] = useState(0);
  const [passage, setPassage] = useState<Passage>(
    () => configureState?.passage ?? pickNewRandomPassage(null, configureState?.difficulty)
  );
  const [wpm, setWpm] = useState<number>(() => configureState?.wpm ?? 300);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [questionBreakdown, setQuestionBreakdown] = useState<QuestionBreakdownItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [guidedChunkingEnabled] = useState<boolean>(() => {
    if (configureState?.guidedChunkingEnabled != null) return configureState.guidedChunkingEnabled;
    return loadGuidedChunkingPrefs().enabled;
  });
  const [guidedChunkSize, setGuidedChunkSize] = useState<number>(() => {
    if (configureState?.guidedChunkSize != null) return clampChunkSize(configureState.guidedChunkSize);
    return loadGuidedChunkingPrefs().chunkSize;
  });
  const [suggestedChunkSize, setSuggestedChunkSize] = useState<number | null>(null);
  const [readingTimeSeconds, setReadingTimeSeconds] = useState<number | null>(null);
  const hasAutoSavedRef = useRef(false);
  const readingStartTimeRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    saveGuidedChunkingPrefs({ enabled: guidedChunkingEnabled, chunkSize: guidedChunkSize });
  }, [guidedChunkingEnabled, guidedChunkSize]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    if (phase === "reading") {
      readingStartTimeRef.current = Date.now();
      trackEvent("trainer_started", {
        training_type: "speed_reading",
        difficulty: configureState?.difficulty ?? "medium",
        passage_id: passage?.id,
      });
      setActiveTrainer("speed_reading", "reading");
    } else if (phase === "results") {
      clearActiveTrainer();
    }
  }, [phase, configureState?.difficulty, passage?.id]);

  useEffect(() => {
    if (phase !== "results") {
      setSuggestedChunkSize(null);
      return;
    }
    if (!guidedChunkingEnabled) {
      setSuggestedChunkSize(null);
      return;
    }
    const accuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;
    const nextSize = getSuggestedChunkSize(guidedChunkSize, accuracy);
    setSuggestedChunkSize(nextSize);
  }, [phase, guidedChunkingEnabled, guidedChunkSize, quizCorrect, quizTotal]);

  const passageText = passage?.text ?? "";
  const wordCount = passageText.trim().split(/\s+/).filter(Boolean).length;
  const questionCount = configureState ? Math.min(3, configureState.questionCount ?? 3) : 3;
  const WPM_MIN = 200;
  const WPM_MAX = 900;
  const difficulty: TrainingDifficulty = configureState?.difficulty ?? "medium";

  const handleReaderFinish = useCallback((finishedWpm: number, opts?: { timeSpentSeconds: number; usedOvertime?: boolean }) => {
    if (opts?.timeSpentSeconds != null && opts.timeSpentSeconds > 0) {
      setReadingTimeSeconds(opts.timeSpentSeconds);
      setWpm(Math.round((wordCount / opts.timeSpentSeconds) * 60));
    } else {
      setReadingTimeSeconds(null);
      setWpm(finishedWpm);
    }
    setPhase("quiz");
  }, [wordCount]);

  const handleQuizComplete = useCallback((correct: number, total: number, breakdown: QuestionBreakdownItem[]) => {
    setQuizCorrect(correct);
    setQuizTotal(total);
    setQuestionBreakdown(breakdown);
    setPhase("results");
  }, []);

  const handleSaveProgress = useCallback(
    async (rating?: import("../components/quiz/ResultsView").WpmRating, opts?: { skipRestart?: boolean }) => {
      if (!user) {
        appendGuestSession({
          training_type: "speed_reading",
          difficulty,
          wpm,
          correct: quizCorrect,
          total: quizTotal,
          passage_id: passage?.id ?? null,
          ...(rating != null && { wpm_rating: rating }),
          ...(readingTimeSeconds != null && readingTimeSeconds > 0 && { time_seconds: readingTimeSeconds }),
        });
        openAuthModal();
        return;
      }
      setSaveError(null);
      setSaveInProgress(true);
      const payload: SessionInsertPayload = {
        user_id: user.id,
        training_type: "speed_reading",
        difficulty,
        wpm,
        correct: quizCorrect,
        total: quizTotal,
        passage_id: passage?.id ?? null,
        ...(rating != null && { wpm_rating: rating }),
        ...(readingTimeSeconds != null && readingTimeSeconds > 0 && { time_seconds: readingTimeSeconds }),
      };
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("sessions").insert(payload);
          if (error) throw error;
        });
        supabaseLog.info("Speed reading session saved", {
          userId: user.id,
          wpm: payload.wpm,
          correct: payload.correct,
          total: payload.total,
        });
        trackEvent("trainer_completed", { training_type: "speed_reading", difficulty });
        clearActiveTrainer();
        if (!mountedRef.current) return;
        setSaveError(null);
        if (!opts?.skipRestart) {
          setPhase("reading");
          setReadingKey((k) => k + 1);
          readingStartTimeRef.current = null;
        }
      } catch (err: unknown) {
        const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Unknown error";
        supabaseLog.error("Failed to save speed_reading session", {
          message,
          userId: user.id,
        });
        if (!mountedRef.current) return;
        setSaveError(getSessionSaveErrorMessage(err));
      } finally {
        if (mountedRef.current) setSaveInProgress(false);
      }
    },
    [user, wpm, quizCorrect, quizTotal, passage?.id, difficulty, openAuthModal, readingTimeSeconds]
  );

  const handleRestart = useCallback(() => {
    hasAutoSavedRef.current = false;
    setReadingTimeSeconds(null);
    setPhase("reading");
    setReadingKey((k) => k + 1);
    setPassage((current) => pickNewRandomPassage(current?.id, difficulty));
    readingStartTimeRef.current = null;
  }, [difficulty]);

  const handleRestartWithWpm = useCallback(
    (newWpm: number) => {
      setWpm(Math.min(WPM_MAX, Math.max(WPM_MIN, newWpm)));
      setReadingTimeSeconds(null);
      hasAutoSavedRef.current = false;
      setPhase("reading");
      setReadingKey((k) => k + 1);
      setPassage((current) => pickNewRandomPassage(current?.id, difficulty));
      readingStartTimeRef.current = null;
    },
    [difficulty]
  );

  const handleApplySuggestedChunkSize = useCallback(() => {
    if (suggestedChunkSize == null) return;
    setGuidedChunkSize(suggestedChunkSize);
    setSuggestedChunkSize(null);
  }, [suggestedChunkSize]);

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      handleSaveProgress(undefined, { skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "speed_reading",
        difficulty,
        wpm,
        correct: quizCorrect,
        total: quizTotal,
        passage_id: passage?.id ?? null,
        ...(readingTimeSeconds != null && readingTimeSeconds > 0 && { time_seconds: readingTimeSeconds }),
      });
    }
  }, [phase, handleSaveProgress, user, wpm, quizCorrect, quizTotal, passage?.id, difficulty, readingTimeSeconds]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  if (!configureState) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="Free UCAT Speed Reading Trainer"
        description="Practice dense academic texts with speed reading and scanning tools to improve your UCAT Verbal Reasoning scores."
        canonicalUrl={getSiteBaseUrl() ? `${getSiteBaseUrl()}/reader` : undefined}
        imageUrl={getSiteBaseUrl() ? `${getSiteBaseUrl()}/og-trainer.png` : undefined}
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4 min-w-0" tabIndex={-1}>
        {phase === "reading" && (
          <ReaderEngine
            key={`reading-${readingKey}`}
            text={passageText}
            initialWpm={wpm}
            onFinish={handleReaderFinish}
            passageTitle={passage?.title}
            wordCount={wordCount}
            guidedChunkingEnabled={guidedChunkingEnabled}
            chunkSize={guidedChunkSize}
          />
        )}
        {phase === "quiz" && (
          <DistortionQuiz
            passageText={passageText}
            onComplete={handleQuizComplete}
            questionCount={questionCount}
          />
        )}
        {phase === "results" && (
          <ResultsView
            wpm={wpm}
            correct={quizCorrect}
            total={quizTotal}
            passageTitle={passage?.title}
            passageText={passageText}
            timeSpentSeconds={
              readingTimeSeconds ?? (readingStartTimeRef.current != null ? Math.round((Date.now() - readingStartTimeRef.current) / 1000) : 0)
            }
            questionBreakdown={questionBreakdown}
            onRestart={handleRestart}
            onTrySlowerWpm={() => handleRestartWithWpm(wpm - 25)}
            onTrySameSettings={() => handleRestart()}
            onTryFasterWpm={() => handleRestartWithWpm(wpm + 25)}
            saveError={saveError}
            saving={saveInProgress}
            guidedChunkingEnabled={guidedChunkingEnabled}
            chunkSize={guidedChunkSize}
            suggestedChunkSize={suggestedChunkSize}
            onAcceptSuggestedChunkSize={handleApplySuggestedChunkSize}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
