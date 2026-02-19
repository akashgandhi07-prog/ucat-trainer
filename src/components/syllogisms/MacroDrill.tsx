import { useEffect, useState, useCallback } from "react";
import { useSyllogismLogic } from "./useSyllogismLogic";

const DRAG_DATA_KEY = "application/x-syllogism-answer";

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

export default function MacroDrill() {
  const {
    questions,
    userAnswers,
    totalElapsedSeconds,
    loading,
    error,
    sessionFinished,
    lastSummary,
    fetchMacroBlock,
    setAnswerForIndex,
    finishSession,
    getLatestUserAnswers,
  } = useSyllogismLogic("macro");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const answeredCount =
    questions.length > 0
      ? userAnswers.filter((a) => a !== null).length
      : 0;

  useEffect(() => {
    fetchMacroBlock();
  }, [fetchMacroBlock]);

  const stimulus = questions[0]?.stimulus_text ?? "";

  const handleToggle = useCallback(
    (index: number, value: boolean) => {
      if (sessionFinished) return;
      setAnswerForIndex(index, value);
      setSubmitError(null);
    },
    [sessionFinished, setAnswerForIndex]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, value: boolean) => {
      if (sessionFinished) return;
      e.dataTransfer.setData(DRAG_DATA_KEY, value ? "yes" : "no");
      e.dataTransfer.effectAllowed = "copy";
    },
    [sessionFinished]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      if (sessionFinished) return;
      const raw = e.dataTransfer.getData(DRAG_DATA_KEY);
      if (raw === "yes") handleToggle(index, true);
      else if (raw === "no") handleToggle(index, false);
    },
    [sessionFinished, handleToggle]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!sessionFinished) setDragOverIndex(index);
    },
    [sessionFinished]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverIndex(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (questions.length === 0) return;
    const latest = getLatestUserAnswers();
    const hasUnanswered = latest.some((a) => a === null);
    if (hasUnanswered) {
      setSubmitError("Please make a judgement for all five conclusions.");
      return;
    }
    setSubmitError(null);
    await finishSession();
  }, [questions.length, getLatestUserAnswers, finishSession]);

  return (
    <div className="px-4 pb-4">
      <div className="w-full max-w-6xl mx-auto pt-2">
        <header className="mb-2 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Macro Syllogism Drill
            </h1>
            <p className="mt-0.5 text-base text-slate-600">
              Review the stimulus on the left and decide whether each
              conclusion on the right follows. Choose Yes or No for all five,
              then submit.
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
            {questions.length > 0 && !sessionFinished && (
              <p className="text-sm font-medium text-slate-600">
                Answered: {answeredCount} / {questions.length}
              </p>
            )}
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Time
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {totalElapsedSeconds}s
              </p>
            </div>
          </div>
        </header>

        {error && (
          <p className="mb-3 text-base text-red-600">{error}</p>
        )}

        {/* Stem (stimulus) ABOVE – read first, then conclusions and Yes/No below */}
        <section className="mb-3">
          <div className="rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Stimulus
            </h2>
            {loading && !stimulus && (
              <p className="text-base text-slate-600">Loading stimulus…</p>
            )}
            {stimulus && (
              <p className="text-lg font-bold text-slate-900 whitespace-pre-line leading-relaxed">
                {stimulus}
              </p>
            )}
            <p className="mt-2 text-sm font-medium text-slate-700">
              Place &lsquo;Yes&rsquo; if the conclusion does follow. Place
              &lsquo;No&rsquo; if it does not. On desktop, drag from the panel
              into each box; on mobile, tap Yes or No in each row.
            </p>
          </div>
        </section>

        {/* Conclusions list + Yes/No palette below the stem */}
        <section className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Conclusions: question boxes + drop zones */}
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Conclusions
            </h2>

              {questions.length === 0 && loading && (
                <p className="text-base text-slate-600">
                  Loading conclusions…
                </p>
              )}

              <ol className="space-y-1.5">
                {questions.map((q, index) => {
                  const userAnswer = userAnswers[index];
                  const showFeedback = sessionFinished;
                  const isCorrect =
                    showFeedback &&
                    userAnswer !== null &&
                    userAnswer === q.is_correct;
                  const feedbackLabel =
                    showFeedback && userAnswer !== null
                      ? getFeedbackLabel(isCorrect, q.is_correct)
                      : null;
                  const isDropTarget = dragOverIndex === index;
                  const interactive = !sessionFinished;

                  return (
                    <li
                      key={q.id}
                      className={
                        "border-b border-slate-200 last:border-b-0 pb-2 last:pb-0 " +
                        (showFeedback
                          ? isCorrect
                            ? "rounded-lg bg-green-50 px-2 pt-1.5 pb-2"
                            : "rounded-lg bg-red-50 px-2 pt-1.5 pb-2"
                          : "")
                      }
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_6rem] items-center gap-3">
                        {/* Conclusion text – no extra box, just number + text */}
                        <p className="text-base text-slate-900 leading-snug py-0.5">
                          <span className="font-semibold text-slate-600">{index + 1}.</span> {q.conclusion_text}
                        </p>

                        {/* Answer: drop zone on desktop; on mobile/touch use tap buttons (drag doesn't work well) */}
                        <div
                          className={
                            "flex flex-shrink-0 items-center justify-center gap-1 rounded text-base font-medium transition-colors min-h-10 " +
                            (userAnswer === true
                              ? "bg-slate-100 text-slate-900 w-24"
                              : userAnswer === false
                                ? "bg-slate-100 text-slate-900 w-24"
                                : isDropTarget
                                  ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300 w-24"
                                  : "bg-slate-50 text-slate-400")
                          }
                          onDragOver={interactive ? (e) => handleDragOver(e, index) : undefined}
                          onDragLeave={interactive ? handleDragLeave : undefined}
                          onDrop={interactive ? (e) => handleDrop(e, index) : undefined}
                          role={interactive ? "group" : undefined}
                          aria-label={
                            interactive
                              ? `Answer for conclusion ${index + 1}. Drop Yes or No here.`
                              : undefined
                          }
                        >
                          {userAnswer === true ? (
                            "Yes"
                          ) : userAnswer === false ? (
                            "No"
                          ) : (
                            <>
                              {/* Tap targets for mobile (drag-drop doesn't work on touch) */}
                              <span className="flex gap-1 lg:hidden">
                                <button
                                  type="button"
                                  onClick={() => handleToggle(index, true)}
                                  className="min-h-[36px] min-w-[3rem] rounded border border-slate-300 bg-white px-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 touch-manipulation"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggle(index, false)}
                                  className="min-h-[36px] min-w-[3rem] rounded border border-slate-300 bg-white px-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 touch-manipulation"
                                >
                                  No
                                </button>
                              </span>
                              {/* Desktop: show dash and rely on drag-drop */}
                              <span className="hidden lg:inline w-24 text-center">—</span>
                            </>
                          )}
                        </div>
                      </div>

                      {showFeedback && (
                        <div className="mt-1.5 pl-0 text-sm">
                          <p className="text-slate-700">
                            <span className="font-semibold text-slate-900">Correct: {q.is_correct ? "Yes" : "No"}</span>
                            {" · "}
                            <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                              {feedbackLabel}
                            </span>
                          </p>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {submitError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-base text-red-700">{submitError}</p>
                </div>
              )}

              <div className="pt-1.5 flex items-center justify-between gap-3 flex-wrap">
                {lastSummary && sessionFinished && (
                  <p className="text-base text-slate-700">
                    Score:{" "}
                    <span className="font-semibold">{lastSummary.score}</span>{" "}
                    (UCAT macro scoring). Correct judgements{" "}
                    <span className="font-semibold">
                      {lastSummary.correct} / {lastSummary.total_questions}
                    </span>
                    .
                  </p>
                )}
                <div className="flex-1" />
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {sessionFinished ? (
                    <button
                      type="button"
                      onClick={() => fetchMacroBlock()}
                      disabled={loading}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                    >
                      {loading ? "Loading…" : "Next drill"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={questions.length === 0}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                    >
                      Submit answers
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Yes/No palette – drag these into the answer boxes (realistic UCAT style) */}
            {questions.length > 0 && (
              <div
                className={
                  "flex flex-shrink-0 flex-col justify-center rounded-lg border-2 border-slate-300 bg-slate-100 p-2 " +
                  (sessionFinished ? "opacity-60" : "")
                }
                aria-label="Drag Yes or No into an answer box"
              >
                <div className="flex flex-col gap-2">
                  <div
                    draggable={!sessionFinished}
                    onDragStart={(e) => handleDragStart(e, true)}
                    className={
                      "flex min-h-[44px] min-w-[5rem] cursor-grab active:cursor-grabbing items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 text-base font-medium text-slate-900 shadow " +
                      (sessionFinished ? "cursor-default" : "hover:border-slate-400 hover:shadow-md")
                    }
                  >
                    Yes
                  </div>
                  <div
                    draggable={!sessionFinished}
                    onDragStart={(e) => handleDragStart(e, false)}
                    className={
                      "flex min-h-[44px] min-w-[5rem] cursor-grab active:cursor-grabbing items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-4 text-base font-medium text-slate-900 shadow " +
                      (sessionFinished ? "cursor-default" : "hover:border-slate-400 hover:shadow-md")
                    }
                  >
                    No
                  </div>
                </div>
                <p className="mt-1.5 text-center text-sm text-slate-600">
                  Drop Yes or No into an answer box
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
  );
}

