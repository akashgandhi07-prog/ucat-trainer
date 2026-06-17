import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import DistortionQuiz from "../components/quiz/DistortionQuiz";
import ReReadPassageModal from "../components/quiz/ReReadPassageModal";
import type { QuestionBreakdownItem } from "../components/quiz/DistortionQuiz";
import { useAuth } from "../hooks/useAuth";
import type { Passage } from "../data/passages";
import { appendGuestSession } from "../lib/guestSessions";
import { newClientSessionId, upsertTrainerSession } from "../lib/trainerSessionLog";
import type { TrainerSessionUpsert } from "../lib/trainerSessionLog";
import { supabaseLog } from "../lib/logger";
import { getSessionSaveErrorMessage } from "../lib/sessionSaveError";
import type { TrainingDifficulty } from "../types/training";
import {
  getVrPassageCandidates,
  hydrateSeenFromCloud,
  markPassageSeen,
  pickUnseenPassage,
} from "../lib/vrPassageHistory";
import { getSiteBaseUrl } from "../lib/siteUrl";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { trainerFaqs } from "../data/trainerFaqs";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";
import { PostDrillUpsell } from "../components/layout/ProductUpsell";
import QuestionMediaBlock from "../components/media/QuestionMediaBlock";

type Phase = "reading" | "questions" | "results";

type LocationState = {
  trainingType: "rapid_recall";
  passage: Passage;
  timeLimitSeconds: number;
  difficulty?: TrainingDifficulty;
  category?: string;
};

function RecallModeExplainer() {
  return (
    <div className="mb-4 rounded-lg bg-training-highlight-muted border border-primary/10 px-4 py-3 text-left">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-1">
        Recall mode
      </p>
      <p className="text-sm text-foreground leading-relaxed">
        Recall mode focuses on whether you can remember exactly what the passage stated. The review after each run mainly points you back to the key sentence, rather than walking through a full exam-style reasoning chain.
      </p>
    </div>
  );
}

export default function RapidRecallPage() {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const initialTimeLimit = state?.timeLimitSeconds ?? 60;
  const difficulty: TrainingDifficulty = state?.difficulty ?? "medium";
  const category: string = state?.category ?? "all";

  const [phase, setPhase] = useState<Phase>("reading");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(initialTimeLimit);
  const [passage, setPassage] = useState<Passage | null>(
    () =>
      state?.passage ??
      pickUnseenPassage("rapid_recall", getVrPassageCandidates(difficulty, category))
  );
  const [secondsLeft, setSecondsLeft] = useState(initialTimeLimit);
  const [showMoreTimeModal, setShowMoreTimeModal] = useState(false);
  const [overtimeMode, setOvertimeMode] = useState(false);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const overtimeStartRef = useRef<number>(0);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [questionBreakdown, setQuestionBreakdown] = useState<QuestionBreakdownItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState<number | null>(null);
  const [passageModalOpen, setPassageModalOpen] = useState(false);
  const hasAutoSavedRef = useRef(false);
  const sessionIdRef = useRef(newClientSessionId());
  const mountedRef = useRef(true);
  const { user } = useAuth();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Hydrate cross-device passage history once per page load (fire-and-forget).
  useEffect(() => {
    if (user) void hydrateSeenFromCloud(user.id);
  }, [user]);

  // The passage is actually shown once the reading phase starts.
  useEffect(() => {
    if (phase === "reading" && passage?.id) markPassageSeen("rapid_recall", passage.id);
  }, [phase, passage?.id]);

  useEffect(() => {
    if (phase === "reading") {
      trackEvent("trainer_started", {
        training_type: "rapid_recall",
        difficulty,
        time_limit_seconds: timeLimitSeconds,
      });
      setActiveTrainer("rapid_recall", "reading");
    } else if (phase === "results") {
      clearActiveTrainer();
    }
  }, [phase, difficulty, timeLimitSeconds]);

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
    if (phase === "reading" && secondsLeft === 0 && !overtimeMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot modal trigger when the countdown hits zero; fires at most once per reading phase
      setShowMoreTimeModal(true);
    }
  }, [phase, secondsLeft, overtimeMode]);

  useEffect(() => {
    if (!overtimeMode) return;
    overtimeStartRef.current = Date.now();
    const interval = setInterval(() => {
      setOvertimeSeconds(Math.floor((Date.now() - overtimeStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [overtimeMode]);

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
      const timeSeconds =
        readingSeconds != null ? readingSeconds : timeLimitSeconds + overtimeSeconds;
      if (!user) {
        appendGuestSession({
          training_type: "rapid_recall",
          difficulty,
          wpm: null,
          correct: quizCorrect,
          total: quizTotal,
          time_seconds: timeSeconds,
          passage_id: passage?.id ?? null,
          client_session_id: sessionIdRef.current,
        });
        return;
      }
      setSaveError(null);
      setSaving(true);
      const payload: TrainerSessionUpsert = {
        training_type: "rapid_recall",
        difficulty,
        wpm: null,
        correct: quizCorrect,
        total: quizTotal,
        time_seconds: timeSeconds,
        passage_id: passage?.id ?? null,
      };
      const saved = await upsertTrainerSession(user.id, sessionIdRef.current, payload);
      if (saved) {
        supabaseLog.info("Rapid recall session saved", {
          userId: user.id,
          correct: quizCorrect,
          total: quizTotal,
        });
        trackEvent("trainer_completed", { training_type: "rapid_recall", difficulty });
        clearActiveTrainer();
        if (!mountedRef.current) return;
        setSaveError(null);
        if (!opts?.skipRestart) {
          sessionIdRef.current = newClientSessionId();
          setPhase("reading");
          setSecondsLeft(timeLimitSeconds);
          setShowMoreTimeModal(false);
          setOvertimeMode(false);
          setOvertimeSeconds(0);
        }
      } else {
        if (!mountedRef.current) return;
        setSaveError(getSessionSaveErrorMessage(null));
      }
      if (mountedRef.current) setSaving(false);
    },
    [user, quizCorrect, quizTotal, timeLimitSeconds, overtimeSeconds, readingSeconds, difficulty, passage?.id]
  );

  useEffect(() => {
    if (phase !== "results" || hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-save on entering results; guarded by hasAutoSavedRef
      handleSaveProgress({ skipRestart: true });
    } else {
      appendGuestSession({
        training_type: "rapid_recall",
        difficulty,
        wpm: null,
        correct: quizCorrect,
        total: quizTotal,
        time_seconds:
          readingSeconds != null ? readingSeconds : timeLimitSeconds + overtimeSeconds,
        passage_id: passage?.id ?? null,
        client_session_id: sessionIdRef.current,
      });
    }
  }, [phase, handleSaveProgress, user, quizCorrect, quizTotal, difficulty, readingSeconds, timeLimitSeconds, overtimeSeconds, passage?.id]);

  if (!passage) {
    return <Navigate to="/?mode=rapid_recall" replace />;
  }

  const passageText = passage.text;

  const computeReadingSeconds = () => {
    const baseUsed = timeLimitSeconds - secondsLeft;
    const extra = overtimeMode ? overtimeSeconds : 0;
    const total = Math.max(1, baseUsed + extra);
    setReadingSeconds(total);
  };

  const handleFinishReading = () => {
    computeReadingSeconds();
    setPhase("questions");
  };

  const handleMoreTimeNo = () => {
    setShowMoreTimeModal(false);
    computeReadingSeconds();
    setPhase("questions");
  };

  const handleMoreTimeYes = () => {
    setShowMoreTimeModal(false);
    setOvertimeMode(true);
    setOvertimeSeconds(0);
    overtimeStartRef.current = Date.now();
  };

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-foreground font-medium rounded-lg ring-2 ring-primary opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-rapid-recall-trainer` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Verbal Reasoning", url: `${base}/ucat-verbal-reasoning-practice` },
        { name: "Rapid Recall", url: `${base}/ucat-rapid-recall-trainer` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen">
      <SEOHead
        title="UCAT Rapid Recall Trainer (UK)"
        description="True or false statements under time pressure. Free Rapid Recall practice for UCAT Verbal Reasoning for UK medical and dental applicants."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className={`flex-1 py-12 px-4 ${phase === "results" ? "" : "flex items-center justify-center"}`} tabIndex={-1}>
        {phase === "reading" && (
          <div className="w-full max-w-3xl">
            <RecallModeExplainer />
            {showMoreTimeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog" aria-labelledby="rapid-more-time-title">
                <div className="bg-card rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
                  <h2 id="rapid-more-time-title" className="text-lg font-semibold text-foreground mb-2">Time&apos;s up</h2>
                  <p className="text-muted-foreground mb-6">More time?</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleMoreTimeYes}
                      className="min-h-[44px] px-5 py-2.5 bg-secondary text-foreground font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={handleMoreTimeNo}
                  className="min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      No, go to questions
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <span className="text-sm font-medium text-muted-foreground">
                {overtimeMode ? "Rapid Recall - overtime" : "Rapid Recall - read before time runs out"}
              </span>
              <span
                className={`text-2xl font-bold tabular-nums shrink-0 ${
                  overtimeMode ? "text-red-600" : secondsLeft <= 10 ? "text-red-600" : "text-foreground"
                }`}
              >
                {overtimeMode
                  ? `+${Math.floor(overtimeSeconds / 60)}:${(overtimeSeconds % 60).toString().padStart(2, "0")}`
                  : `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`}
              </span>
            </div>
            <div className="bg-card rounded-xl border border-border p-8 max-h-[75vh] min-h-[50vh] overflow-y-auto overscroll-behavior-contain">
              <QuestionMediaBlock media={passage.media} placement="stem" className="mb-4" />
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {passageText}
              </p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleFinishReading}
                className="min-h-[44px] px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
              >
                Finish & start questions
              </button>
            </div>
          </div>
        )}

        {phase === "questions" && (
          <div className="w-full max-w-2xl">
            <RecallModeExplainer />
            <DistortionQuiz
              passageText={passageText}
              passageTitle={passage.title}
              passageId={passage.id}
              trainerType="rapid_recall"
              onComplete={handleQuizComplete}
              allowReRead={false}
            />
          </div>
        )}

        {phase === "results" && (
          <div className="w-full max-w-2xl mx-auto">
            <RecallModeExplainer />
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Rapid Recall - Results
            </h2>
            <div className="bg-card rounded-xl border border-border p-6 space-y-4 mb-6">
              <p className="text-lg text-foreground">
                <span className="font-medium">Score:</span> {quizCorrect}/{quizTotal} correct
              </p>
              <p className="text-muted-foreground text-sm">
                Time limit: {timeLimitSeconds}s
              </p>
              <button
                type="button"
                onClick={() => setPassageModalOpen(true)}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-slate-200 border border-border rounded-lg transition-colors"
              >
                View passage
              </button>
              <ReReadPassageModal
                isOpen={passageModalOpen}
                onClose={() => setPassageModalOpen(false)}
                passageText={passageText}
                passageMedia={passage.media}
              />
              {(() => {
                const wordCount = passageText.trim().split(/\s+/).filter(Boolean).length;
                const effectiveSeconds = readingSeconds != null ? readingSeconds : timeLimitSeconds;
                const effectiveWpm =
                  effectiveSeconds > 0 ? Math.round((wordCount / effectiveSeconds) * 60) : 0;
                const nextTimeSuggestion = Math.max(30, timeLimitSeconds - 10);
                const canPushPace = nextTimeSuggestion < timeLimitSeconds;
                return (
                  <>
                    <p className="text-foreground text-sm mt-3 pt-3 border-t border-border">
                      You spent {effectiveSeconds}s to read ~{wordCount} words ≈ {effectiveWpm} WPM.
                      {canPushPace && ` Next time try ${nextTimeSuggestion}s to push your pace.`}
                    </p>
                  </>
                );
              })()}
            </div>
            {questionBreakdown.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6 space-y-3 mb-6 text-left">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Question breakdown
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  See how you answered each statement based on the passage.
                </p>
                <div className="space-y-3">
                  {questionBreakdown.map((item, index) => {
                    const isCorrect = item.correctAnswerRaw
                      ? item.userAnswer === item.correctAnswerRaw
                      : (item.userAnswer === "true" && item.correctAnswer) ||
                        (item.userAnswer === "false" && !item.correctAnswer);
                    const hasDiff =
                      item.correctAnswerRaw === "false" &&
                      !!item.originalFragment &&
                      !!item.replacedFragment;

                    function highlightIn(text: string, fragment: string, cls: string) {
                      if (!fragment) return <>{text}</>;
                      const idx = text.toLowerCase().indexOf(fragment.toLowerCase());
                      if (idx === -1) return <>{text}</>;
                      return (
                        <>
                          {text.slice(0, idx)}
                          <mark className={cls}>{text.slice(idx, idx + fragment.length)}</mark>
                          {text.slice(idx + fragment.length)}
                        </>
                      );
                    }

                    const explanation = (() => {
                      if (hasDiff) return null;
                      const snippet = item.passageSnippet;
                      if (item.correctAnswerRaw === "true") {
                        return snippet
                          ? `The passage stated: "${snippet}" - this statement is a paraphrase of that, so the correct answer is True.`
                          : "This statement matches what the passage says, so the correct answer is True.";
                      }
                      if (item.correctAnswerRaw === "false") {
                        const distortDetail = item.distortionLabel ? ` Trap: ${item.distortionLabel}.` : "";
                        return snippet
                          ? `The passage stated: "${snippet}". The statement distorts this.${distortDetail} The correct answer is False.`
                          : `This statement changes or overstates what the passage says.${distortDetail} The correct answer is False.`;
                      }
                      return snippet
                        ? `The passage only stated: "${snippet}". The statement goes beyond what the passage confirms. The correct answer is Can't Tell.`
                        : "The passage doesn't give enough information to decide, so the correct answer is Can't Tell.";
                    })();
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
                          <span className="text-xs font-semibold text-foreground">
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
                        <p className="text-sm text-foreground mb-1.5">
                          {item.statement}?
                        </p>
                        <p className="text-xs text-foreground">
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
                        {(hasDiff || explanation) && (
                          <div className="mt-2 pt-2 border-t border-border/70 space-y-1.5">
                            {hasDiff ? (
                              <>
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">What changed</p>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Statement (what you saw)</p>
                                  <p className="text-xs text-foreground bg-red-50 border-l-2 border-red-400 pl-2 py-1 rounded-r">
                                    {highlightIn(item.statement, item.replacedFragment!, "bg-red-200 text-red-900 font-semibold rounded px-0.5 not-italic")}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Original passage</p>
                                  <p className="text-xs text-foreground bg-green-50 border-l-2 border-green-500 pl-2 py-1 rounded-r">
                                    {highlightIn(item.passageSnippet!, item.originalFragment!, "bg-green-200 text-green-900 font-semibold rounded px-0.5 not-italic")}
                                  </p>
                                </div>
                                {item.distortionLabel && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Trap: <span className="font-medium text-muted-foreground">{item.distortionLabel}</span>
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">
                                  Why the answer is {item.correctAnswerLabel}
                                </p>
                                <p className="text-xs text-foreground">{explanation}</p>
                              </>
                            )}
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
              <p className="mb-4 text-sm text-muted-foreground inline-flex items-center gap-2" aria-live="polite">
                <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" aria-hidden />
                Saving…
              </p>
            )}
            {(() => {
              const nextTimeSuggestion = Math.max(30, timeLimitSeconds - 10);
              const canPushPace = nextTimeSuggestion < timeLimitSeconds;
              return (
                <div className="flex flex-col items-center gap-3">
                  {canPushPace && (
                    <button
                      type="button"
                      onClick={() => {
                        hasAutoSavedRef.current = false;
                        sessionIdRef.current = newClientSessionId();
                        setTimeLimitSeconds(nextTimeSuggestion);
                        setSecondsLeft(nextTimeSuggestion);
                        setOvertimeMode(false);
                        setOvertimeSeconds(0);
                        setReadingSeconds(null);
                        setPhase("reading");
                        setPassage((current) =>
                          pickUnseenPassage("rapid_recall", getVrPassageCandidates(difficulty, category), current?.id)
                        );
                      }}
                      className="min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Try again with {nextTimeSuggestion}s
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      hasAutoSavedRef.current = false;
                      sessionIdRef.current = newClientSessionId();
                      setSecondsLeft(timeLimitSeconds);
                        setOvertimeMode(false);
                        setOvertimeSeconds(0);
                        setReadingSeconds(null);
                      setPhase("reading");
                      setPassage((current) =>
                        pickUnseenPassage("rapid_recall", getVrPassageCandidates(difficulty, category), current?.id)
                      );
                    }}
                    className={`min-h-[44px] px-6 py-3 font-medium rounded-lg transition-colors ${
                      canPushPace
                        ? "bg-secondary text-foreground hover:bg-slate-200"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    Try another passage
                  </button>
                </div>
              );
            })()}
            <PostDrillUpsell
              accuracy={
                quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : undefined
              }
            />
            <div className="mt-4">
              <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-sm text-muted-foreground hover:text-primary">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </main>
      <UcatGuidesPanel context="trainer" trainingType="rapid_recall" contentMaxWidthClass="max-w-6xl mx-auto w-full" />
      <TrainerFaqSection
        id="rapid-recall-faq"
        title="Common questions about the UCAT Rapid Recall trainer"
        intro="Guidance on how to use this Rapid Recall trainer to strengthen True/False/Can’t Tell style reasoning and short-term retention for UCAT Verbal Reasoning."
        faqs={trainerFaqs.rapidRecall}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
