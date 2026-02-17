import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import DistortionQuiz from "../components/quiz/DistortionQuiz";
import ReReadPassageModal from "../components/quiz/ReReadPassageModal";
import type { QuestionBreakdownItem } from "../components/quiz/DistortionQuiz";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import type { Passage } from "../data/passages";
import type { SessionInsertPayload } from "../types/session";
import { appendGuestSession } from "../lib/guestSessions";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { withRetry } from "../lib/retry";
import type { TrainingDifficulty } from "../types/training";
import { pickNewRandomPassage } from "../lib/passages";

type Phase = "reading" | "questions" | "results";

type LocationState = {
  trainingType: "rapid_recall";
  passage: Passage;
  timeLimitSeconds: number;
  difficulty?: TrainingDifficulty;
};

export default function RapidRecallPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const timeLimitSeconds = state?.timeLimitSeconds ?? 60;
  const difficulty: TrainingDifficulty = state?.difficulty ?? "medium";

  const [phase, setPhase] = useState<Phase>("reading");
  const [passage, setPassage] = useState<Passage | null>(
    () => state?.passage ?? pickNewRandomPassage(null, difficulty)
  );
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [questionBreakdown, setQuestionBreakdown] = useState<QuestionBreakdownItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [passageModalOpen, setPassageModalOpen] = useState(false);
  const hasAutoSavedRef = useRef(false);
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
    if (phase !== "reading") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "reading" && secondsLeft === 0) {
      setPhase("questions");
    }
  }, [phase, secondsLeft]);

  const handleQuizComplete = useCallback(
    (correct: number, total: number, breakdown: QuestionBreakdownItem[]) => {
      setQuizCorrect(correct);
      setQuizTotal(total);
      setQuestionBreakdown(breakdown);
      setPhase("results");
    },
    []
  );

  const handleSaveProgress = useCallback(
    async (opts?: { skipRestart?: boolean }) => {
      if (!user) {
        appendGuestSession({
          training_type: "rapid_recall",
          difficulty,
          wpm: null,
          correct: quizCorrect,
          total: quizTotal,
        });
        openAuthModal();
        return;
      }
      setSaveError(null);
      setSaving(true);
      const payload: SessionInsertPayload = {
        user_id: user.id,
        training_type: "rapid_recall",
        difficulty,
        wpm: null,
        correct: quizCorrect,
        total: quizTotal,
      };
      try {
        await withRetry(async () => {
          const { error } = await supabase.from("sessions").insert(payload);
          if (error) throw error;
        });
        supabaseLog.info("Rapid recall session saved", {
          userId: user.id,
          correct: quizCorrect,
          total: quizTotal,
        });
        if (!mountedRef.current) return;
        setSaveError(null);
        if (!opts?.skipRestart) {
          setPhase("reading");
          setSecondsLeft(timeLimitSeconds);
        }
      } catch (err: unknown) {
        const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Unknown error";
        supabaseLog.error("Failed to save rapid_recall session", {
          message,
          userId: user.id,
        });
        if (!mountedRef.current) return;
        setSaveError("Failed to save. Please try again.");
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    },
    [user, quizCorrect, quizTotal, timeLimitSeconds, difficulty, openAuthModal]
  );

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      handleSaveProgress({ skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "rapid_recall",
        difficulty,
        wpm: null,
        correct: quizCorrect,
        total: quizTotal,
      });
    }
  }, [phase, handleSaveProgress, user, quizCorrect, quizTotal, difficulty]);

  if (!passage) {
    return <Navigate to="/?mode=rapid_recall" replace />;
  }

  const passageText = passage.text;

  const handleFinishReading = () => {
    setPhase("questions");
  };

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 flex items-center justify-center py-12 px-4" tabIndex={-1}>
        {phase === "reading" && (
          <div className="w-full max-w-3xl">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <span className="text-sm font-medium text-slate-500">
                Rapid Recall - read before time runs out
              </span>
              <span
                className={`text-2xl font-bold tabular-nums shrink-0 ${
                  secondsLeft <= 10 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-h-[75vh] min-h-[50vh] overflow-y-auto overscroll-behavior-contain">
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                {passageText}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleFinishReading}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Finish &amp; start questions
              </button>
            </div>
          </div>
        )}

        {phase === "questions" && (
          <DistortionQuiz
            passageText={passageText}
            onComplete={handleQuizComplete}
            allowReRead={false}
          />
        )}

        {phase === "results" && (
          <div className="w-full max-w-md mx-auto text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">
              Rapid Recall - Results
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 mb-6">
              <p className="text-lg text-slate-700">
                <span className="font-medium">Score:</span> {quizCorrect}/{quizTotal} correct
              </p>
              <p className="text-slate-600 text-sm">
                Time limit: {timeLimitSeconds}s
              </p>
              <button
                type="button"
                onClick={() => setPassageModalOpen(true)}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
              >
                View passage
              </button>
              <ReReadPassageModal
                isOpen={passageModalOpen}
                onClose={() => setPassageModalOpen(false)}
                passageText={passageText}
              />
              {(() => {
                const wordCount = passageText.trim().split(/\s+/).filter(Boolean).length;
                const effectiveWpm = timeLimitSeconds > 0
                  ? Math.round((wordCount / timeLimitSeconds) * 60)
                  : 0;
                const nextTimeSuggestion = Math.max(30, timeLimitSeconds - 10);
                return (
                  <p className="text-slate-700 text-sm mt-3 pt-3 border-t border-slate-200">
                    You had {timeLimitSeconds}s to read ~{wordCount} words ≈ {effectiveWpm} WPM.
                    Next time try {nextTimeSuggestion}s to push your pace.
                  </p>
                );
              })()}
            </div>
            {questionBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3 mb-6 text-left">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">
                  Question breakdown
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  See how you answered each statement based on the passage.
                </p>
                <div className="space-y-3">
                  {questionBreakdown.map((item, index) => {
                    const isCorrect =
                      (item.userAnswer === "true" && item.correctAnswer) ||
                      (item.userAnswer === "false" && !item.correctAnswer);
                    return (
                      <div
                        key={index}
                        className={`rounded-lg border p-3 ${
                          isCorrect
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-slate-700">
                            Q{index + 1}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                              isCorrect
                                ? "bg-emerald-200 text-emerald-800"
                                : "bg-red-200 text-red-800"
                            }`}
                          >
                            {isCorrect ? (
                              <>
                                <span aria-hidden>✓</span> Correct
                              </>
                            ) : (
                              <>
                                <span aria-hidden>✕</span> Incorrect
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 mb-1.5">
                          {item.statement}?
                        </p>
                        <p className="text-xs text-slate-700">
                          Your answer:{" "}
                          {item.userAnswer === "true"
                            ? "True"
                            : item.userAnswer === "false"
                            ? "False"
                            : "Can't tell"}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-red-700 mt-0.5">
                            Correct answer: {item.correctAnswerLabel}
                          </p>
                        )}
                        {item.passageSnippet && (
                          <div className="mt-2 pt-2 border-t border-slate-200/70">
                            <p className="text-[11px] font-medium text-slate-500 mb-0.5">
                              From the passage
                            </p>
                            <p className="text-xs text-slate-700">
                              {item.passageSnippet}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {saveError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {saveError}
              </p>
            )}
            {saving && (
              <p className="mb-4 text-sm text-slate-600 inline-flex items-center gap-2" aria-live="polite">
                <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" aria-hidden />
                Saving…
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                hasAutoSavedRef.current = false;
                setPhase("reading");
                setSecondsLeft(timeLimitSeconds);
                setPassage((current) => pickNewRandomPassage(current?.id, difficulty));
              }}
              className="min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              Try another
            </button>
            <div className="mt-4">
              <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-sm text-slate-500 hover:text-blue-600">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
