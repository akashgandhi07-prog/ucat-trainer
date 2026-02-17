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
import { PASSAGES } from "../data/passages";
import SEOHead from "../components/seo/SEOHead";
import type { SessionInsertPayload } from "../types/session";
import { appendGuestSession } from "../lib/guestSessions";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { withRetry } from "../lib/retry";

type Phase = "reading" | "quiz" | "results";

type ConfigureState = {
  trainingType: "speed_reading";
  passageId: string;
  passage: Passage;
  wpm: number;
  questionCount?: number;
};

export default function ReaderPage() {
  const location = useLocation();
  const configureState = location.state as ConfigureState | null;
  const [phase, setPhase] = useState<Phase>("reading");
  const [readingKey, setReadingKey] = useState(0);
  const [wpm, setWpm] = useState(300);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [questionBreakdown, setQuestionBreakdown] = useState<QuestionBreakdownItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveInProgress, setSaveInProgress] = useState(false);
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
    if (phase === "reading") {
      readingStartTimeRef.current = Date.now();
    }
  }, [phase]);

  if (!configureState) {
    return <Navigate to="/" replace />;
  }

  const passage: Passage = configureState.passage ?? PASSAGES[0];
  const passageText = passage?.text ?? "";
  const initialWpm = configureState.wpm ?? undefined;
  const questionCount = Math.min(3, configureState.questionCount ?? 3);

  const handleReaderFinish = useCallback((finishedWpm: number) => {
    setWpm(finishedWpm);
    setPhase("quiz");
  }, []);

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
          wpm,
          correct: quizCorrect,
          total: quizTotal,
          passage_id: passage?.id ?? null,
          ...(rating != null && { wpm_rating: rating }),
        });
        openAuthModal();
        return;
      }
      setSaveError(null);
      setSaveInProgress(true);
      const payload: SessionInsertPayload = {
        user_id: user.id,
        training_type: "speed_reading",
        wpm,
        correct: quizCorrect,
        total: quizTotal,
        passage_id: passage?.id ?? null,
        ...(rating != null && { wpm_rating: rating }),
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
        setSaveError("Failed to save. Please try again.");
      } finally {
        if (mountedRef.current) setSaveInProgress(false);
      }
    },
    [user, wpm, quizCorrect, quizTotal, passage?.id, openAuthModal]
  );

  const handleRestart = useCallback(() => {
    hasAutoSavedRef.current = false;
    setPhase("reading");
    setReadingKey((k) => k + 1);
    readingStartTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      handleSaveProgress(undefined, { skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "speed_reading",
        wpm,
        correct: quizCorrect,
        total: quizTotal,
        passage_id: passage?.id ?? null,
      });
    }
  }, [phase, handleSaveProgress, user, wpm, quizCorrect, quizTotal, passage?.id]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="Free UCAT Speed Reading Trainer"
        description="Practice dense academic texts with speed reading and scanning tools to improve your UCAT Verbal Reasoning scores."
        canonicalUrl={typeof window !== "undefined" ? `${window.location.origin}/reader` : undefined}
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
            initialWpm={initialWpm}
            onFinish={handleReaderFinish}
            passageTitle={passage?.title}
            wordCount={passageText.trim().split(/\s+/).filter(Boolean).length}
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
              readingStartTimeRef.current != null
                ? Math.round((Date.now() - readingStartTimeRef.current) / 1000)
                : 0
            }
            questionBreakdown={questionBreakdown}
            onRestart={handleRestart}
            saveError={saveError}
            saving={saveInProgress}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
