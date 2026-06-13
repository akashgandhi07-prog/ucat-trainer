import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import type { Passage } from "../data/passages";
import { pickNewRandomPassage } from "../lib/passages";
import { generateExceptSet } from "../components/quiz/DistortionQuiz";
import type { ExceptQuestion } from "../components/quiz/DistortionQuiz";
import { appendGuestSession } from "../lib/guestSessions";
import type { GuestSessionPayload } from "../lib/guestSessions";
import { newClientSessionId, upsertTrainerSession } from "../lib/trainerSessionLog";
import type { TrainerSessionUpsert } from "../lib/trainerSessionLog";
import { supabaseLog } from "../lib/logger";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import { getSiteBaseUrl } from "../lib/siteUrl";
import SEOHead from "../components/seo/SEOHead";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";
import { PostDrillUpsell } from "../components/layout/ProductUpsell";

const QUESTIONS_PER_PASSAGE = 4;

// TODO(orchestrator): cloud session logging for this trainer needs 'not_except'
// added to the sessions_training_type_check DB constraint (handled via a DB
// migration by the orchestrator), plus the training_type unions in
// src/types/session.ts and the guest-session validator in src/lib/guestSessions.ts.
// The save below is already structured through upsertTrainerSession with
// training_type 'not_except' and gated behind CLOUD_LOGGING_ENABLED, so it works
// as soon as the constraint value exists.
const CLOUD_LOGGING_ENABLED = true;
const TRAINING_TYPE = "not_except";

type Phase = "reading" | "quiz" | "results";

type LocationState = {
  trainingType?: typeof TRAINING_TYPE;
  passage?: Passage;
  difficulty?: TrainingDifficulty;
};

function buildExceptQuestions(passage: Passage): ExceptQuestion[] {
  const used = new Set<string>();
  const out: ExceptQuestion[] = [];
  for (let i = 0; i < QUESTIONS_PER_PASSAGE; i++) {
    const q = generateExceptSet(passage, { exclude: used });
    if (!q) break;
    out.push(q);
  }
  return out;
}

export default function NotExceptTrainerPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const difficulty: TrainingDifficulty = state?.difficulty ?? "medium";

  const [phase, setPhase] = useState<Phase>("reading");
  const [passage, setPassage] = useState<Passage>(
    () => state?.passage ?? pickNewRandomPassage(null, difficulty)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hasAutoSavedRef = useRef(false);
  const sessionIdRef = useRef(newClientSessionId());
  const mountedRef = useRef(true);
  const { user } = useAuth();

  const questions = useMemo(() => buildExceptQuestions(passage), [passage]);
  const current = questions[currentIndex];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (phase === "reading") {
      trackEvent("trainer_started", {
        training_type: TRAINING_TYPE,
        difficulty,
        passage_id: passage.id,
      });
      setActiveTrainer(TRAINING_TYPE, "reading");
    } else if (phase === "quiz") {
      setActiveTrainer(TRAINING_TYPE, "quiz");
    } else if (phase === "results") {
      clearActiveTrainer();
    }
    // Intentionally keyed on phase and passage so a new passage re-tracks the start.
  }, [phase, difficulty, passage.id]);

  const handleSaveProgress = useCallback(async () => {
    const timeSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    if (!user) {
      // Guest results stay local. The cast is needed until 'not_except' is added
      // to the training_type unions (see TODO above).
      appendGuestSession({
        training_type: TRAINING_TYPE as GuestSessionPayload["training_type"],
        wpm: null,
        correct: correctCount,
        total: questions.length,
        time_seconds: timeSeconds,
        difficulty,
        client_session_id: sessionIdRef.current,
      });
      return;
    }
    if (!CLOUD_LOGGING_ENABLED) return;
    setSaveError(null);
    setSaving(true);
    const payload: TrainerSessionUpsert = {
      training_type: TRAINING_TYPE,
      difficulty,
      wpm: null,
      correct: correctCount,
      total: questions.length,
      passage_id: passage.id,
      time_seconds: timeSeconds,
    };
    const saved = await upsertTrainerSession(user.id, sessionIdRef.current, payload);
    if (!mountedRef.current) return;
    if (!saved) {
      setSaveError(getSessionSaveErrorMessage(null));
      setSaving(false);
      return;
    }
    supabaseLog.info("NOT/EXCEPT session saved", {
      userId: user.id,
      correct: correctCount,
      total: questions.length,
      time_seconds: timeSeconds,
    });
    setSaveError(null);
    setSaving(false);
  }, [user, correctCount, questions.length, startTime, difficulty, passage.id]);

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    trackEvent("trainer_completed", {
      training_type: TRAINING_TYPE,
      difficulty,
      correct: correctCount,
      total: questions.length,
    });
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-save on results */
    handleSaveProgress();
  }, [phase, difficulty, correctCount, questions.length, handleSaveProgress]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (submitted) return;
      setSelected(idx);
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    if (selected == null || submitted || !current) return;
    setSubmitted(true);
    if (selected === current.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  }, [selected, submitted, current]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setPhase("results");
    }
  }, [currentIndex, questions.length]);

  const handleRestart = useCallback(() => {
    hasAutoSavedRef.current = false;
    sessionIdRef.current = newClientSessionId();
    setPassage((cur) => pickNewRandomPassage(cur.id, difficulty));
    setPhase("reading");
    setCurrentIndex(0);
    setSelected(null);
    setSubmitted(false);
    setCorrectCount(0);
    setStartTime(Date.now());
    setSaveError(null);
  }, [difficulty]);

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-vr-not-except-trainer` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Verbal Reasoning", url: `${base}/ucat-verbal-reasoning-practice` },
        { name: "NOT/EXCEPT Drill", url: `${base}/ucat-vr-not-except-trainer` },
      ]
    : undefined;

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-foreground font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  const seoHead = (
    <SEOHead
      title="UCAT NOT/EXCEPT Trainer"
      description="Spot the statement that is not supported by the passage. Free NOT/EXCEPT drill for UCAT Verbal Reasoning, built for UK applicants."
      canonicalUrl={canonicalUrl}
      breadcrumbs={breadcrumbs}
    />
  );

  if (phase === "results") {
    const accuracy =
      questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <div className="flex flex-col min-h-screen">
        {seoHead}
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1 flex flex-col py-12 px-4" tabIndex={-1}>
          <div className="w-full max-w-4xl mx-auto mb-4">
            <BreadcrumbNav items={breadcrumbs} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-md mx-auto text-center">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                NOT/EXCEPT Drill - Results
              </h2>
              <div className="bg-card rounded-xl border border-border p-6 space-y-4 mb-6">
                <p className="text-lg text-foreground">
                  Correct {correctCount}/{questions.length}
                </p>
                <p className="text-muted-foreground text-sm">Accuracy: {accuracy}%</p>
                <p className="text-muted-foreground text-sm">
                  Passage: {passage.title}
                </p>
              </div>
              {saveError && (
                <p className="mb-4 text-sm text-destructive bg-destructive-muted border border-destructive rounded-lg px-4 py-2">
                  {saveError}
                </p>
              )}
              {saving && (
                <p
                  className="mb-4 text-sm text-muted-foreground inline-flex items-center gap-2"
                  aria-live="polite"
                >
                  <span
                    className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"
                    aria-hidden
                  />
                  Saving…
                </p>
              )}
              <button
                type="button"
                onClick={handleRestart}
                className="min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
              >
                Try another passage
              </button>
              <PostDrillUpsell accuracy={questions.length > 0 ? accuracy : undefined} />
              <div className="mt-4">
                <Link
                  to="/"
                  className="min-h-[44px] inline-flex items-center justify-center py-2 text-sm text-muted-foreground hover:text-primary"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/50">
      {seoHead}
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 py-10 px-4" tabIndex={-1}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-4">
            <BreadcrumbNav items={breadcrumbs} />
          </div>

          {phase === "reading" && (
            <>
              <div className="bg-card rounded-xl border border-border p-5 mb-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Read the passage carefully
                </p>
                <p className="text-sm text-muted-foreground">
                  You will then face {questions.length > 0 ? questions.length : QUESTIONS_PER_PASSAGE} questions
                  asking which statement is NOT supported by the passage.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 mb-5">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {passage.title}
                </h2>
                <div className="text-foreground leading-[1.7] space-y-5 text-[15px]">
                  {passage.text
                    .trim()
                    .split(/\n\n+/)
                    .map((p, i) => (
                      <p key={i}>{p.trim()}</p>
                    ))}
                </div>
              </div>
              {questions.length === 0 ? (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    This passage cannot support NOT/EXCEPT questions. Try another one.
                  </p>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
                  >
                    Try another passage
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("quiz");
                      setStartTime(Date.now());
                    }}
                    className="min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
                  >
                    Start questions
                  </button>
                </div>
              )}
            </>
          )}

          {phase === "quiz" && current && (
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-medium text-muted-foreground">
                  QUESTION {currentIndex + 1} OF {questions.length}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {correctCount} correct so far
                </span>
              </div>
              <p className="text-[16px] leading-[1.5] text-foreground mb-6 font-medium">
                {current.prompt}
              </p>
              <div className="flex flex-col gap-3 mb-6">
                {current.options.map((option, idx) => {
                  const isSelected = selected === idx;
                  const isAnswer = idx === current.correctIndex;
                  let optionClass = "border-border hover:bg-secondary";
                  if (submitted) {
                    if (isAnswer) {
                      optionClass = "border-training-success bg-training-success-muted";
                    } else if (isSelected) {
                      optionClass = "border-destructive bg-destructive-muted";
                    } else {
                      optionClass = "border-border opacity-70";
                    }
                  } else if (isSelected) {
                    optionClass = "border-slate-400 bg-secondary";
                  }
                  return (
                    <div key={idx}>
                      <button
                        type="button"
                        onClick={() => handleSelect(idx)}
                        disabled={submitted}
                        className={`w-full min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-foreground text-left flex items-start gap-3 ${optionClass}`}
                      >
                        <span className="font-medium shrink-0" aria-hidden>
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span>{option.text}</span>
                      </button>
                      {submitted && (
                        <p
                          className={`mt-1.5 px-1 text-sm ${
                            isAnswer ? "text-emerald-700" : "text-muted-foreground"
                          }`}
                        >
                          {option.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {!submitted ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selected == null}
                  className="min-h-[44px] px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`rounded-lg border p-4 ${
                      selected === current.correctIndex
                        ? "bg-training-success-muted border-training-success"
                        : "bg-destructive-muted border-destructive"
                    }`}
                  >
                    <p className="font-semibold text-foreground">
                      {selected === current.correctIndex
                        ? "Correct"
                        : `Incorrect. The unsupported statement was option ${String.fromCharCode(
                            65 + current.correctIndex
                          )}.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="min-h-[44px] px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
                  >
                    {currentIndex < questions.length - 1 ? "Next question" : "See results"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
