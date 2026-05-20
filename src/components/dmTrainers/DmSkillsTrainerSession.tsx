import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "../../lib/cn";
import { useDmSkillsTrainer } from "../../hooks/useDmSkillsTrainer";
import type { DmTrainerOptionId, DmTrainerQuestion, DmTrainerType } from "../../types/dmTrainers";
import { isArgumentJudgeReview } from "../../types/dmTrainers";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../../lib/analytics";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import { getDmTrainerFeedbackContext } from "../../lib/dmTrainerFeedback";
import FlagQuestionButton from "./FlagQuestionButton";
import { scrollPageToTop } from "../../lib/scrollPageToTop";
import { useAppShell } from "../../contexts/AppShellContext";
import { APP_CONTENT_X } from "../../lib/appContentLayout";

const OPTION_KEYS: Record<string, DmTrainerOptionId> = {
  "1": "A",
  "2": "B",
  "3": "C",
  "4": "D",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

type Props = {
  trainerType: DmTrainerType;
};

const DRILL_OPTION_GRID_CLASS = "grid w-full grid-cols-2 items-start gap-2.5";

function optionSurfaceClasses(
  optId: DmTrainerOptionId,
  selected: DmTrainerOptionId | null,
  correctAnswer: DmTrainerOptionId,
  showFeedback: boolean,
): string {
  const chosen = selected === optId;
  const isAnswer = optId === correctAnswer;
  if (showFeedback) {
    if (isAnswer) return "border-green-500 bg-green-50";
    if (chosen && !isAnswer) return "border-red-400 bg-red-50";
    return "border-border bg-secondary/80 opacity-75";
  }
  if (chosen) return "border-primary bg-primary/5";
  return "border-border bg-white hover:border-amber-300 hover:bg-amber-50/50";
}

function DrillOptionButton({
  opt,
  selected,
  correctAnswer,
  showFeedback,
  onSelect,
}: {
  opt: DmTrainerQuestion["options"][number];
  selected: DmTrainerOptionId | null;
  correctAnswer: DmTrainerOptionId;
  showFeedback: boolean;
  onSelect: (id: DmTrainerOptionId) => void;
}) {
  const chosen = selected === opt.id;
  const isAnswer = opt.id === correctAnswer;
  const showRole = showFeedback && opt.label && (isAnswer || chosen);
  const roleLabel = opt.label ? opt.label.replace(/-/g, " ") : "";

  return (
    <button
      type="button"
      role="option"
      aria-selected={chosen}
      disabled={showFeedback}
      onClick={() => onSelect(opt.id)}
      className={cn(
        "block w-full rounded-xl border px-3 py-2.5 text-left",
        "transition-[colors,box-shadow] duration-150 disabled:cursor-default",
        optionSurfaceClasses(opt.id, selected, correctAnswer, showFeedback),
      )}
    >
      <p className="text-sm leading-snug text-foreground">
        <span className="font-semibold text-foreground">{opt.id}. </span>
        {opt.text}
      </p>
      {showRole ? (
        <span className="mt-1 block text-[11px] leading-tight text-muted-foreground">Role: {roleLabel}</span>
      ) : null}
    </button>
  );
}

function DrillOptionGrid({
  current,
  selected,
  showFeedback,
  onSelect,
}: {
  current: DmTrainerQuestion;
  selected: DmTrainerOptionId | null;
  showFeedback: boolean;
  onSelect: (id: DmTrainerOptionId) => void;
}) {
  return (
    <div className={DRILL_OPTION_GRID_CLASS} role="listbox" aria-label="Answer options">
      {current.options.map((opt) => (
        <DrillOptionButton
          key={opt.id}
          opt={opt}
          selected={selected}
          correctAnswer={current.correctAnswer}
          showFeedback={showFeedback}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function DmSkillsTrainerSession({ trainerType }: Props) {
  const {
    config,
    phase,
    questionsLoading,
    questionsError,
    questionSource,
    reloadQuestions,
    current,
    currentIndex,
    total,
    selected,
    showFeedback,
    elapsedSeconds,
    answers,
    correctCount,
    incorrectCount,
    retryMode,
    startDrill,
    submitAnswer,
    goToNext,
    restartDrill,
    retryIncorrect,
    backToIntro,
  } = useDmSkillsTrainer(trainerType);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const inAppShell = useAppShell();

  useLayoutEffect(() => {
    if (phase === "drill") {
      scrollPageToTop({ behavior: currentIndex > 0 ? "smooth" : "auto" });
    } else if (phase === "results") {
      scrollPageToTop({ behavior: "smooth" });
    }
  }, [currentIndex, phase]);

  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: config.analyticsType,
      pathname: config.canonicalPath,
    });
  }, [config.analyticsType, config.canonicalPath]);

  useEffect(() => {
    if (phase === "drill") {
      setActiveTrainer(config.analyticsType, "drill");
    }
    return () => {
      clearActiveTrainer();
    };
  }, [phase, config.analyticsType]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== "drill" || !current) return;
      if (!showFeedback) {
        const id = OPTION_KEYS[e.key];
        if (id) {
          e.preventDefault();
          submitAnswer(id);
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        goToNext();
      }
    },
    [phase, current, showFeedback, submitAnswer, goToNext],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isCorrect =
    showFeedback && selected != null && current != null && selected === current.correctAnswer;
  const review = current?.review;
  const argReview = review && isArgumentJudgeReview(review) ? review : null;

  return (
    <div className={cn("pb-8", inAppShell ? APP_CONTENT_X : "px-4")}>
      <div className={cn("w-full pt-4", !inAppShell && "max-w-3xl mx-auto")}>
        <div className="bg-card rounded-xl border border-border p-5 sm:p-6 lg:p-8 overflow-hidden">
          <div
            className={cn(
              "mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
              phase !== "drill" && "mb-4",
            )}
          >
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{config.title}</h1>
              {phase !== "drill" ? (
                <p className="mt-1 text-sm text-muted-foreground">{config.skillSummary}</p>
              ) : current ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {total}
                  {retryMode ? " (retry)" : ""}
                  <span className="mx-1.5 text-muted-foreground" aria-hidden>
                    ·
                  </span>
                  <span className="font-medium text-foreground">
                    Score {correctCount}/{answers.length}
                  </span>
                </p>
              ) : null}
            </div>
            {phase === "drill" && current ? (
              <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  <span aria-hidden>🚩</span>
                  Report
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs tabular-nums">
                  <span className="font-medium uppercase tracking-wide text-muted-foreground">Time</span>
                  <span className="font-semibold text-foreground">{elapsedSeconds}s</span>
                </span>
              </div>
            ) : null}
          </div>


          {phase === "intro" && (
            <div className="space-y-5">
              {questionsLoading && <p className="text-sm text-muted-foreground">Loading questions…</p>}
              {questionsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <p>{questionsError}</p>
                  <button
                    type="button"
                    onClick={() => void reloadQuestions()}
                    className="mt-2 font-medium text-red-900 underline"
                  >
                    Try again
                  </button>
                </div>
              )}
              {questionSource === "local" && !questionsLoading && !questionsError && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Using offline question set. Connect to load the latest bank from your account.
                </p>
              )}
              {!questionsLoading && !questionsError && (
                <div className="lg:grid lg:grid-cols-[1fr_minmax(11rem,14rem)] lg:gap-8 lg:items-start">
                  <ul className="list-disc pl-5 space-y-2 text-sm text-foreground">
                    {config.introBullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={startDrill}
                    className="w-full min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 inline-flex items-center justify-center gap-2 lg:sticky lg:top-4"
                  >
                    Start drill
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === "drill" && current && (
            <div className="space-y-3">
                <div
                  className={cn(
                    "rounded-lg border border-border bg-secondary",
                    showFeedback ? "px-3 py-2.5 sm:px-4 sm:py-3" : "p-4",
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Stem
                  </p>
                  <p
                    className={cn(
                      "text-foreground leading-relaxed",
                      showFeedback ? "text-sm leading-snug" : "text-base",
                    )}
                  >
                    {current.stem}
                  </p>
                </div>

                <p className="text-sm font-semibold text-foreground">{current.question}</p>

                <DrillOptionGrid
                  current={current}
                  selected={selected}
                  showFeedback={showFeedback}
                  onSelect={submitAnswer}
                />

                {showFeedback ? (
                  <>
                    <div className="rounded-lg border border-border bg-secondary px-3 py-3 sm:px-4 space-y-3">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isCorrect ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                        {!isCorrect ? (
                          <span className="font-normal text-foreground">
                            {" "}
                            · correct answer {current.correctAnswer}
                          </span>
                        ) : null}
                      </p>

                      {argReview ? (
                        <>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold">Exact aim: </span>
                            {argReview.exactAim}
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">{current.explanation}</p>
                        </>
                      ) : (
                        <p className="text-sm text-foreground leading-relaxed">{current.explanation}</p>
                      )}

                      {current.wrongOptionReasons && (
                        <div className="space-y-1.5 border-t border-border/80 pt-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Why each option?
                          </p>
                          {current.options.map((opt) => {
                            const reason = current.wrongOptionReasons?.[opt.id];
                            if (!reason) return null;
                            const isAnswer = opt.id === current.correctAnswer;
                            return (
                              <p key={opt.id} className="text-xs text-foreground leading-relaxed">
                                <span
                                  className={cn(
                                    "font-semibold",
                                    isAnswer ? "text-green-700" : "text-red-700",
                                  )}
                                >
                                  {opt.id}:{" "}
                                </span>
                                {reason}
                              </p>
                            );
                          })}
                        </div>
                      )}

                      {current.generalRule && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
                            Rule to remember
                          </p>
                          <p className="text-sm text-amber-900 leading-relaxed">{current.generalRule}</p>
                        </div>
                      )}

                      {current.keyInsight && (
                        <div className="rounded-lg border border-border bg-secondary px-3 py-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground mb-1">
                            Key insight
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">{current.keyInsight}</p>
                        </div>
                      )}

                      {current.optionalWorkingSteps && current.optionalWorkingSteps.length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-4 border-t border-border/80 pt-2 text-xs text-muted-foreground">
                          {current.optionalWorkingSteps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="sticky bottom-0 z-10 -mx-5 border-t border-border bg-white/95 px-5 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                      <button
                        type="button"
                        onClick={() => goToNext()}
                        className="flex w-full min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {currentIndex >= total - 1 ? "See results" : "Next question"}
                      </button>
                      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
                        Space or Enter to continue
                      </p>
                      {current.dbId && (
                        <div className="mt-2 flex justify-center">
                          <FlagQuestionButton
                            dbId={current.dbId}
                            questionLabel={current.id}
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium uppercase tracking-wide">Shortcuts</span>
                    <span className="mx-1">·</span>
                    <span>1 to 4 or A to D to answer</span>
                  </p>
                )}
            </div>
          )}

          {phase === "results" && (
            <div className="mt-2 space-y-4">
              <div
                className={cn(
                  "rounded-lg border p-5 text-center",
                  correctCount === total
                    ? "bg-green-50 border-green-200"
                    : correctCount >= Math.ceil(total / 2)
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200",
                )}
              >
                <p className="text-2xl font-bold text-foreground">
                  {correctCount} / {answers.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {retryMode ? "Retry complete" : "Drill complete"} in {elapsedSeconds}s
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {incorrectCount > 0 && !retryMode && (
                  <button
                    type="button"
                    onClick={retryIncorrect}
                    className="flex-1 min-h-[44px] rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    Retry incorrect ({incorrectCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={restartDrill}
                  className="flex-1 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 inline-flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  Restart drill
                </button>
                <button
                  type="button"
                  onClick={backToIntro}
                  className="flex-1 min-h-[44px] rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  Back to intro
                </button>
              </div>
            </div>
          )}

          {!inAppShell && (
            <p className="mt-6 text-center text-sm">
              <Link
                to="/ucat-decision-making-practice"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Back to Decision Making
              </Link>
            </p>
          )}

          {current && (
            <QuestionFeedbackModal
              isOpen={feedbackOpen}
              onClose={() => setFeedbackOpen(false)}
              context={getDmTrainerFeedbackContext(
                trainerType,
                current.id,
                config.analyticsType,
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
