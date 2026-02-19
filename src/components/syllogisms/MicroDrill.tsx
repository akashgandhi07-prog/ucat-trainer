import { useEffect, useCallback } from "react";
import { useSyllogismLogic } from "./useSyllogismLogic";

const MICRO_BATCH_SIZE = 10;

function getFeedbackLabel(isCorrect: boolean, actuallyFollows: boolean): string {
  if (isCorrect) {
    return actuallyFollows
      ? "Correct – the conclusion does follow."
      : "Correct – the conclusion does not follow.";
  }
  return actuallyFollows
    ? "Incorrect – the conclusion does follow."
    : "Incorrect – the conclusion does not follow.";
}

export default function MicroDrill() {
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
  } = useSyllogismLogic("micro");

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
    fetchMicroQuestions(MICRO_BATCH_SIZE);
  }, [fetchMicroQuestions]);

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
    <div className="px-4 pb-8">
      <div className="w-full max-w-3xl mx-auto pt-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 overflow-hidden">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  Micro Syllogism Drill
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Decide whether the conclusion must follow from the premises.
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Time
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {totalElapsedSeconds}s
                </p>
              </div>
            </div>

            {error && (
              <p className="mb-3 text-sm text-red-600">{error}</p>
            )}

            {loading && questions.length === 0 && (
              <p className="text-sm text-slate-600">Loading questions…</p>
            )}

            {current && (
              <>
                <div className="mb-4 text-sm text-slate-600 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  {questions.length > 0 && (
                    <span className="font-medium text-slate-700">
                      Score: {correctSoFar} / {answeredCount}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Premises
                </p>
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-base text-slate-800">
                    {current.stimulus_text}
                  </p>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Does this conclusion follow from the premises?
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Conclusion to evaluate
                </p>
                <p className="text-lg font-semibold text-slate-900 mb-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
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
                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <p
                        className={
                          "text-sm font-semibold " +
                          (isCorrectCurrent ? "text-green-600" : "text-red-600")
                        }
                      >
                        {feedbackLabel}
                      </p>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-sm text-slate-700">
                          {current.explanation}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => advanceToNext()}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        Next question
                      </button>
                    </div>
                    <button
                      aria-hidden="true"
                      className="hidden"
                    />
                  </div>
                )}

                <div className="mt-6 text-xs text-slate-500">
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
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Session summary
                  </h2>
                  <p className="mt-2 text-sm text-slate-700">
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
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

