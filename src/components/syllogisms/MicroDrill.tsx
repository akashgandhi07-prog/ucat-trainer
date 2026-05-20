import { useEffect, useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSyllogismLogic } from "./useSyllogismLogic";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import { PostDrillUpsell } from "../layout/ProductUpsell";
import QuestionMediaBlock from "../media/QuestionMediaBlock";
import { useAuth } from "../../hooks/useAuth";
import { useAppShell } from "../../contexts/AppShellContext";
import { APP_CONTENT_X } from "../../lib/appContentLayout";
import { cn } from "../../lib/cn";

const MICRO_BATCH_SIZE = 10;

function scrollTrainerToTop() {
  document.getElementById("app-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
}

function getFeedbackLabel(isCorrect: boolean, actuallyFollows: boolean): string {
  if (isCorrect) {
    return actuallyFollows
      ? "Correct - the conclusion does follow."
      : "Correct - the conclusion does not follow.";
  }
  return actuallyFollows
    ? "Incorrect - the conclusion does follow."
    : "Incorrect - the conclusion does not follow.";
}

export default function MicroDrill() {
  const { loading: authLoading } = useAuth();
  const inAppShell = useAppShell();
  const {
    questions,
    currentIndex,
    userAnswers,
    totalElapsedSeconds,
    loading,
    error,
    sessionFinished,
    lastSummary,
    fetchMicroQuestions,
    submitAnswer,
    advanceToNext,
    goToPrevious,
    goToNext,
  } = useSyllogismLogic("micro");

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const current = questions[currentIndex];
  const hasAnsweredCurrent =
    current != null && userAnswers[currentIndex] !== null;
  const isCorrectCurrent =
    current != null && userAnswers[currentIndex] === current.is_correct;
  const answeredCount = userAnswers.filter((a) => a !== null).length;
  const correctSoFar = questions.filter(
    (q, i) => userAnswers[i] !== null && userAnswers[i] === q.is_correct
  ).length;
  const feedbackLabel =
    current && hasAnsweredCurrent
      ? getFeedbackLabel(isCorrectCurrent, current.is_correct)
      : null;

  useEffect(() => {
    if (authLoading) return;
    fetchMicroQuestions(MICRO_BATCH_SIZE);
  }, [authLoading, fetchMicroQuestions]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!current || loading) return;
      if (sessionFinished) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!hasAnsweredCurrent) submitAnswer(true);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!hasAnsweredCurrent) submitAnswer(false);
      } else if (e.key === " ") {
        e.preventDefault();
        if (hasAnsweredCurrent) {
          advanceToNext();
        }
      }
    },
    [
      current,
      loading,
      sessionFinished,
      hasAnsweredCurrent,
      submitAnswer,
      advanceToNext,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={cn("pb-8", inAppShell ? APP_CONTENT_X : "px-4")}>
      <div className={cn("w-full pt-4", !inAppShell && "max-w-3xl mx-auto")}>
          <div className="bg-card rounded-xl border border-border p-6 sm:p-8 overflow-hidden">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Micro Syllogism Drill
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Decide whether the conclusion must follow from the premises.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Time
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {totalElapsedSeconds}s
                </p>
              </div>
            </div>

            {current && (
              <QuestionFeedbackModal
                isOpen={feedbackOpen}
                onClose={() => setFeedbackOpen(false)}
                context={{
                  trainerType: "syllogism_micro",
                  questionKind: "dm_syllogism",
                  questionIdentifier: `syllogism:${current.id}`,
                  passageId: null,
                  sessionId: null,
                }}
              />
            )}

            {error && (
              <p className="mb-3 text-sm text-red-600">{error}</p>
            )}

            {(authLoading || loading) && questions.length === 0 && (
              <p className="text-sm text-muted-foreground">Loading questions…</p>
            )}

            {current && (
              <>
                <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <button
                      type="button"
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                      aria-label="Previous question"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[7rem] text-center">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <button
                      type="button"
                      onClick={goToNext}
                      disabled={currentIndex >= questions.length - 1}
                      aria-label="Next question"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  {questions.length > 0 && (
                    <span className="text-sm font-medium text-foreground">
                      Score: {correctSoFar} / {answeredCount}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Premises
                </p>
                <div className="mb-6 rounded-lg border border-border p-4">
                  <p className="text-base text-foreground">
                    {current.stimulus_text}
                  </p>
                  <QuestionMediaBlock media={current.media} placement="stem" className="mt-3" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Does this conclusion follow from the premises?
                </p>
                <p className="text-lg font-semibold text-foreground mb-4 rounded-lg border border-border p-4">
                  {current.conclusion_text}
                </p>

                {!hasAnsweredCurrent && (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => submitAnswer(true)}
                      onPointerDown={(e) => e.currentTarget.releasePointerCapture?.(e.pointerId)}
                      disabled={loading && questions.length === 0}
                      className="min-h-[44px] px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation select-none"
                    >
                      Yes, it follows
                    </button>
                    <button
                      type="button"
                      onClick={() => submitAnswer(false)}
                      onPointerDown={(e) => e.currentTarget.releasePointerCapture?.(e.pointerId)}
                      disabled={loading && questions.length === 0}
                      className="min-h-[44px] px-5 py-2.5 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 touch-manipulation select-none"
                    >
                      No, it does not follow
                    </button>
                  </div>
                )}

                {hasAnsweredCurrent && (
                  <div className="mt-6 border-t border-border pt-4 space-y-3">
                      <p
                        className={
                          "text-sm font-semibold " +
                          (isCorrectCurrent ? "text-green-600" : "text-red-600")
                        }
                      >
                        {feedbackLabel}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {current.explanation}
                      </p>
                      <button
                        type="button"
                        onClick={() => setFeedbackOpen(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <span aria-hidden>🚩</span>
                        Report this question
                      </button>
                      {!sessionFinished && (
                        <button
                          type="button"
                          onClick={() => {
                            scrollTrainerToTop();
                            advanceToNext();
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          Next question
                        </button>
                      )}
                  </div>
                )}

                <div className="mt-6 text-xs text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide">
                    Shortcuts
                  </span>
                  <span className="mx-1">·</span>
                  <span>← Yes</span>
                  <span className="mx-1">·</span>
                  <span>→ No</span>
                  <span className="mx-1">·</span>
                  <span>Space next</span>
                </div>
              </>
            )}

            {sessionFinished && lastSummary && (
              <div className="mt-6 border-t border-border pt-4">
                <div className="border-t border-border pt-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    Session summary
                  </h2>
                  <p className="mt-2 text-sm text-foreground">
                    You answered{" "}
                    <span className="font-semibold">
                      {lastSummary.correct} of {lastSummary.total_questions}
                    </span>{" "}
                    correctly. Average time per decision{" "}
                    <span className="font-semibold">
                      {lastSummary.average_time_per_decision.toFixed(2)}s
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => fetchMicroQuestions(MICRO_BATCH_SIZE)}
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Start another micro drill
                  </button>
                </div>
                <PostDrillUpsell
                  accuracy={
                    lastSummary.total_questions > 0
                      ? Math.round(
                          (lastSummary.correct / lastSummary.total_questions) * 100,
                        )
                      : undefined
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
