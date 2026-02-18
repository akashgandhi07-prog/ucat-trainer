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
    <div className="px-4 pb-8">
      <div className="w-full max-w-6xl mx-auto pt-4">
        <header className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              Macro Syllogism Drill
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Review the stimulus on the left and decide whether each
              conclusion on the right follows. Choose Yes or No for all five,
              then submit.
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
        </header>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        {/* Stem (stimulus) ABOVE – read first, then conclusions and Yes/No below */}
        <section className="mb-6">
          <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Stimulus
            </h2>
            {loading && !stimulus && (
              <p className="text-sm text-slate-600">Loading stimulus…</p>
            )}
            {stimulus && (
              <p className="text-base text-slate-900 whitespace-pre-line leading-relaxed">
                {stimulus}
              </p>
            )}
            <p className="mt-4 text-sm font-medium text-slate-700">
              Place &lsquo;Yes&rsquo; if the conclusion does follow. Place
              &lsquo;No&rsquo; if the conclusion does not follow. Drag from the
              Yes/No panel into each answer box.
            </p>
          </div>
        </section>

        {/* Conclusions list + Yes/No palette below the stem */}
        <section className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Conclusions: question boxes + drop zones */}
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Conclusions
            </h2>

              {questions.length === 0 && loading && (
                <p className="text-sm text-slate-600">
                  Loading conclusions…
                </p>
              )}

              <ol className="space-y-3">
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
                    <li key={q.id} className="space-y-2">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3">
                        {/* Conclusion text in a bordered box (official style) */}
                        <div className="flex min-h-[3rem] items-center rounded border border-slate-300 bg-white px-3 py-2">
                          <p className="text-sm text-slate-900">
                            {index + 1}. {q.conclusion_text}
                          </p>
                        </div>

                        {/* Answer slot: grey drop zone when empty, or show placed Yes/No */}
                        <div
                          className={
                            "flex min-h-[3.5rem] min-w-[6rem] flex-shrink-0 flex-col items-center justify-center rounded border-2 text-sm font-medium transition-colors " +
                            (userAnswer === true
                              ? "border-slate-300 bg-white text-slate-900"
                              : userAnswer === false
                                ? "border-slate-300 bg-white text-slate-900"
                                : isDropTarget
                                  ? "border-sky-400 border-dashed bg-sky-50/80 text-sky-700"
                                  : "border-slate-300 bg-slate-100 text-slate-500")
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
                          ) : interactive ? (
                            <>
                              <span className="text-xs">
                                {isDropTarget ? "Drop here" : "Drop Yes or No here"}
                              </span>
                              <span className="mt-1 flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggle(index, true);
                                  }}
                                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggle(index, false);
                                  }}
                                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                  No
                                </button>
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>

                      {showFeedback && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                          <p
                            className={
                              "text-xs font-semibold " +
                              (isCorrect
                                ? "text-green-600"
                                : "text-red-600")
                            }
                          >
                            {feedbackLabel}
                          </p>
                          <p className="text-xs text-slate-700">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              {submitError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
                {lastSummary && sessionFinished && (
                  <p className="text-sm text-slate-700">
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
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={questions.length === 0 || sessionFinished}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
                >
                  {sessionFinished ? "Submitted" : "Submit answers"}
                </button>
              </div>
            </div>

            {/* Yes/No palette – drag these into the answer boxes (realistic UCAT style) */}
            {questions.length > 0 && (
              <div
                className={
                  "flex-shrink-0 rounded-xl border-2 border-slate-300 bg-slate-100 p-4 " +
                  (sessionFinished ? "opacity-60" : "")
                }
                aria-label="Drag Yes or No into an answer box"
              >
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Drag to answer box
                </p>
                <div className="flex flex-col gap-3">
                  <div
                    draggable={!sessionFinished}
                    onDragStart={(e) => handleDragStart(e, true)}
                    className={
                      "flex min-h-[48px] min-w-[5rem] cursor-grab active:cursor-grabbing items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-5 text-base font-medium text-slate-900 shadow " +
                      (sessionFinished ? "cursor-default" : "hover:border-slate-400 hover:shadow-md")
                    }
                  >
                    Yes
                  </div>
                  <div
                    draggable={!sessionFinished}
                    onDragStart={(e) => handleDragStart(e, false)}
                    className={
                      "flex min-h-[48px] min-w-[5rem] cursor-grab active:cursor-grabbing items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-5 text-base font-medium text-slate-900 shadow " +
                      (sessionFinished ? "cursor-default" : "hover:border-slate-400 hover:shadow-md")
                    }
                  >
                    No
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
  );
}

