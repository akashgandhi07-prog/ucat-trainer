import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import DistortionQuiz from "../components/quiz/DistortionQuiz";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import type { Passage } from "../data/passages";
import type { SessionInsertPayload } from "../types/session";
import { appendGuestSession } from "../lib/guestSessions";
import { supabase } from "../lib/supabase";
import { supabaseLog } from "../lib/logger";
import { withRetry } from "../lib/retry";

type Phase = "reading" | "questions" | "results";

type LocationState = {
  trainingType: "rapid_recall";
  passage: Passage;
  timeLimitSeconds: number;
};

export default function RapidRecallPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const passage = state?.passage ?? null;
  const timeLimitSeconds = state?.timeLimitSeconds ?? 60;

  const [phase, setPhase] = useState<Phase>("reading");
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const handleQuizComplete = useCallback((correct: number, total: number, _breakdown: unknown) => {
    setQuizCorrect(correct);
    setQuizTotal(total);
    setPhase("results");
  }, []);

  const handleSaveProgress = useCallback(async () => {
    if (!user) {
      appendGuestSession({
        training_type: "rapid_recall",
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
      setPhase("reading");
      setSecondsLeft(timeLimitSeconds);
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
  }, [user, quizCorrect, quizTotal, timeLimitSeconds, openAuthModal]);

  if (!passage) {
    return <Navigate to="/?mode=rapid_recall" replace />;
  }

  const passageText = passage.text;

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
          <div className="w-full max-w-2xl">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <span className="text-sm font-medium text-slate-500">
                Rapid Recall – read before time runs out
              </span>
              <span
                className={`text-2xl font-bold tabular-nums shrink-0 ${
                  secondsLeft <= 10 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-h-[60vh] overflow-y-auto overscroll-behavior-contain">
              <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                {passageText}
              </p>
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
              Rapid Recall – Results
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 mb-6">
              <p className="text-lg text-slate-700">
                <span className="font-medium">Score:</span> {quizCorrect}/{quizTotal} correct
              </p>
              <p className="text-slate-600 text-sm">
                Time limit: {timeLimitSeconds}s
              </p>
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
            {saveError && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={saving}
              aria-busy={saving}
              className="min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save progress"
              )}
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
