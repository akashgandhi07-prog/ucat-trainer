import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Flag, XCircle, CheckCircle2 } from "lucide-react";
import { useSyllogismLogic } from "./useSyllogismLogic";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import { PostDrillUpsell } from "../layout/ProductUpsell";
import { useAuth } from "../../hooks/useAuth";
import { useAppShell } from "../../contexts/AppShellContext";
import { APP_CONTENT_X } from "../../lib/appContentLayout";
import { cn } from "../../lib/cn";

const FOUNDATION_BATCH_SIZE = 12;

function scrollTrainerToTop() {
  document.getElementById("app-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
}

function getFeedbackLabel(isCorrect: boolean, actuallyFollows: boolean): string {
  if (isCorrect) {
    return actuallyFollows
      ? "Correct - that rule does force the conclusion."
      : "Correct - that conclusion is not guaranteed.";
  }
  return actuallyFollows
    ? "Incorrect - the conclusion is guaranteed by the rule."
    : "Incorrect - the conclusion is not guaranteed.";
}

export default function FoundationDrill() {
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
    fetchFoundationQuestions,
    submitAnswer,
    advanceToNext,
  } = useSyllogismLogic("foundation");

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
    fetchFoundationQuestions(FOUNDATION_BATCH_SIZE);
  }, [authLoading, fetchFoundationQuestions]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!current || loading || sessionFinished) return;
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
                Syllogism Foundations
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Drill the tiny inference rules behind UCAT syllogisms before moving to full questions.
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
                trainerType: "syllogism_foundation",
                questionKind: "dm_syllogism",
                questionIdentifier: `syllogism:${current.id}`,
                passageId: null,
                sessionId: null,
              }}
            />
          )}

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          {(authLoading || loading) && questions.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading questions...</p>
          )}

          {current && (
            <>
              <div className="mb-4 text-sm text-muted-foreground flex items-center justify-between flex-wrap gap-2">
                <span>
                  Rule {currentIndex + 1} of {questions.length}
                </span>
                {questions.length > 0 && (
                  <span className="font-medium text-foreground">
                    Score: {correctSoFar} / {answeredCount}
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Premise
              </p>
              <div className="mb-6 rounded-lg border border-border bg-secondary p-4">
                <p className="text-base text-foreground">{current.stimulus_text}</p>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Does this conclusion have to follow?
              </p>
              <p className="text-lg font-semibold text-foreground mb-2 rounded-lg bg-secondary border border-border p-4">
                {current.conclusion_text}
              </p>

              <p className="text-xs text-muted-foreground mb-4">
                <span className="font-medium">Rule being tested:</span>{" "}
                {current.rule_name ?? current.trick_type.replaceAll("_", " ")}
              </p>

              {!hasAnsweredCurrent && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => submitAnswer(true)}
                    disabled={loading && questions.length === 0}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation select-none"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Yes, it follows
                  </button>
                  <button
                    type="button"
                    onClick={() => submitAnswer(false)}
                    disabled={loading && questions.length === 0}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 touch-manipulation select-none"
                  >
                    <XCircle className="h-4 w-4" />
                    No, it does not
                  </button>
                </div>
              )}

              {hasAnsweredCurrent && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="rounded-lg border border-border bg-secondary p-4 space-y-3">
                    <p
                      className={
                        "text-sm font-semibold " +
                        (isCorrectCurrent ? "text-green-600" : "text-red-600")
                      }
                    >
                      {feedbackLabel}
                    </p>
                    <div className="rounded-lg border border-border bg-white p-3">
                      <p className="text-sm text-foreground">{current.explanation}</p>
                      {current.key_takeaway && (
                        <p className="mt-3 text-sm text-foreground">
                          <span className="font-semibold text-foreground">
                            Key takeaway:
                          </span>{" "}
                          {current.key_takeaway}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setFeedbackOpen(true)}
                        className="mt-3 inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        Report this question
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        scrollTrainerToTop();
                        advanceToNext();
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      Next rule
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">
                  Shortcuts
                </span>
                <span className="mx-1">·</span>
                <span>Left arrow Yes</span>
                <span className="mx-1">·</span>
                <span>Right arrow No</span>
                <span className="mx-1">·</span>
                <span>Space next</span>
              </div>
            </>
          )}

          {sessionFinished && lastSummary && (
            <div className="mt-6 border-t border-border pt-4">
              <div className="rounded-lg border border-border bg-secondary p-4">
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
                  onClick={() => fetchFoundationQuestions(FOUNDATION_BATCH_SIZE)}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Start another foundations drill
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
