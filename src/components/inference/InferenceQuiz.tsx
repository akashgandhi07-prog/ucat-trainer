import { useState, useCallback, useRef, useEffect } from "react";
import SelectablePassage from "./SelectablePassage";
import { getSelectionFromPassage } from "./inferenceSelection";
import { compareSelection, getSpanText } from "../../utils/inferenceComparison";
import type {
  InferenceQuestion,
  InferenceBreakdownItem,
  TextSpan,
  InferenceAnswerResult,
} from "../../types/inference";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import type { TrainingType } from "../../types/training";
import QuestionMediaBlock from "../media/QuestionMediaBlock";

/** Per-question time limit for timed mode, in seconds. */
const QUESTION_TIME_LIMIT_SECONDS = 60;

type InferenceQuizProps = {
  passageText: string;
  questions: InferenceQuestion[];
  /** When true, each question has a 60 second countdown and auto-submits on expiry. */
  timedMode?: boolean;
  onComplete: (
    correct: number,
    total: number,
    breakdown: InferenceBreakdownItem[]
  ) => void;
  /** Called when user presses Next on the last question: request another question (same or new passage). */
  onNextQuestion?: (
    correct: number,
    total: number,
    breakdown: InferenceBreakdownItem[]
  ) => void;
  onProgressChange?: (correct: number, total: number, currentIndex: number) => void;
  onBreakdownChange?: (breakdown: InferenceBreakdownItem[]) => void;
  trainerType?: TrainingType;
  passageId?: string;
};

export default function InferenceQuiz({
  passageText,
  questions,
  timedMode = false,
  onComplete,
  onNextQuestion,
  onProgressChange,
  onBreakdownChange,
  trainerType = "inference_trainer",
  passageId,
}: InferenceQuizProps) {
  const passageRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, InferenceBreakdownItem>>(
    new Map()
  );
  const [feedback, setFeedback] = useState<{
    show: boolean;
    result: InferenceAnswerResult;
    userSpan: TextSpan | null;
    userText: string;
    correctSpan: TextSpan;
    correctText: string;
    explanation: string;
  } | null>(null);
  const [emptySelectionError, setEmptySelectionError] = useState(false);
  // Sentence chosen by tapping in SelectablePassage. Used as a fallback when the
  // DOM selection is gone by the time Submit is tapped (mobile browsers clear it).
  const [tappedSpan, setTappedSpan] = useState<TextSpan | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const current = questions[currentIndex];
  const answeredCount = answers.size;
  const isLastQuestion = currentIndex === questions.length - 1;

  const displayCorrect = [...answers.values()].filter(
    (a) => a.result === "correct" || a.result === "partial"
  ).length;

  useEffect(() => {
    onProgressChange?.(displayCorrect, answeredCount, currentIndex);
  }, [displayCorrect, answeredCount, currentIndex, onProgressChange]);

  useEffect(() => {
    onBreakdownChange?.([...answers.values()]);
  }, [answers, onBreakdownChange]);

  const handleSubmit = useCallback(() => {
    setEmptySelectionError(false);
    const userSpan =
      getSelectionFromPassage(passageRef, passageText) ?? tappedSpan;

    if (!userSpan || userSpan.start >= userSpan.end) {
      setEmptySelectionError(true);
      return;
    }

    const correctSpan = current.correctSpans[0];
    const result = compareSelection(
      userSpan,
      current.correctSpans,
      current.alternateSpans
    ) as InferenceAnswerResult;

    const userText = getSpanText(passageText, userSpan);
    const correctText = getSpanText(passageText, correctSpan);

    const item: InferenceBreakdownItem = {
      questionId: current.id,
      questionText: current.questionText,
      userSpan,
      userText,
      correctSpan,
      correctText,
      result: result === "partial" ? "partial" : result === "correct" ? "correct" : "incorrect",
      explanation: current.explanation,
    };

    setAnswers((prev) => new Map(prev).set(currentIndex, item));
    setFeedback({
      show: true,
      result: item.result,
      userSpan,
      userText,
      correctSpan,
      correctText,
      explanation: current.explanation,
    });
  }, [current, currentIndex, passageText, tappedSpan]);

  const handleSkip = useCallback(() => {
    const correctSpan = current.correctSpans[0];
    const correctText = getSpanText(passageText, correctSpan);
    const item: InferenceBreakdownItem = {
      questionId: current.id,
      questionText: current.questionText,
      userSpan: null,
      userText: "",
      correctSpan,
      correctText,
      result: "skipped",
      explanation: current.explanation,
    };
    setAnswers((prev) => new Map(prev).set(currentIndex, item));
    setFeedback({
      show: true,
      result: "skipped",
      userSpan: null,
      userText: "",
      correctSpan,
      correctText,
      explanation: current.explanation,
    });
    setEmptySelectionError(false);
  }, [current, currentIndex, passageText]);

  // Auto-submit when the timed mode countdown expires: an existing selection is
  // evaluated as normal; no selection (or zero overlap) is marked incorrect.
  const handleTimeExpired = useCallback(() => {
    const correctSpan = current.correctSpans[0];
    const correctText = getSpanText(passageText, correctSpan);
    const userSpan =
      getSelectionFromPassage(passageRef, passageText) ?? tappedSpan;

    let result: InferenceBreakdownItem["result"] = "incorrect";
    let userText = "";
    let evaluatedSpan: TextSpan | null = null;
    if (userSpan && userSpan.start < userSpan.end) {
      const cmp = compareSelection(
        userSpan,
        current.correctSpans,
        current.alternateSpans
      ) as InferenceAnswerResult;
      result = cmp === "partial" ? "partial" : cmp === "correct" ? "correct" : "incorrect";
      userText = getSpanText(passageText, userSpan);
      evaluatedSpan = userSpan;
    }

    const item: InferenceBreakdownItem = {
      questionId: current.id,
      questionText: current.questionText,
      userSpan: evaluatedSpan,
      userText,
      correctSpan,
      correctText,
      result,
      explanation: current.explanation,
    };
    setAnswers((prev) => new Map(prev).set(currentIndex, item));
    setFeedback({
      show: true,
      result,
      userSpan: evaluatedSpan,
      userText,
      correctSpan,
      correctText,
      explanation: current.explanation,
    });
    setTimedOut(true);
    setEmptySelectionError(false);
  }, [current, currentIndex, passageText, tappedSpan]);

  // Per-question clock: counts up while the question is open (paused on feedback).
  useEffect(() => {
    if (feedback) return;
    const interval = setInterval(() => {
      setQuestionSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [feedback, currentIndex]);

  // Timed mode expiry.
  useEffect(() => {
    if (!timedMode || feedback) return;
    if (questionSeconds >= QUESTION_TIME_LIMIT_SECONDS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-submit when the per-question timer expires; guarded by the feedback check
      handleTimeExpired();
    }
  }, [timedMode, feedback, questionSeconds, handleTimeExpired]);

  const handleNext = useCallback(() => {
    setFeedback(null);
    setEmptySelectionError(false);
    setTappedSpan(null);
    window.getSelection()?.removeAllRanges();
    setQuestionSeconds(0);
    setTimedOut(false);
    if (isLastQuestion && onNextQuestion) {
      const total = questions.length;
      const correct = [...answers.values()].filter(
        (a) => a.result === "correct" || a.result === "partial"
      ).length;
      const breakdown = [...answers.values()];
      onNextQuestion(correct, total, breakdown);
    } else if (isLastQuestion) {
      const total = questions.length;
      const correct = [...answers.values()].filter(
        (a) => a.result === "correct" || a.result === "partial"
      ).length;
      const breakdown = [...answers.values()];
      onComplete(correct, total, breakdown);
    } else {
      document.getElementById("app-main-scroll")?.scrollTo({ top: 0, behavior: "instant" });
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastQuestion, questions.length, answers, onNextQuestion, onComplete]);

  const highlights: { span: TextSpan; type: "correct" | "incorrect" }[] = [];
  if (feedback?.show && feedback.userSpan) {
    if (feedback.result === "incorrect" || feedback.result === "skipped") {
      highlights.push({ span: feedback.userSpan, type: "incorrect" });
    }
  }
  if (feedback?.show && feedback.correctSpan) {
    highlights.push({ span: feedback.correctSpan, type: "correct" });
  }

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 text-center py-12">
        <p className="text-muted-foreground">
          No inference questions available for this passage.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Left: Passage */}
      <div className="lg:w-[48%] flex-shrink-0">
        <div className="bg-card rounded-xl border border-border p-6 max-h-[70vh] overflow-y-auto">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Passage
          </h3>
          <SelectablePassage
            passageText={passageText}
            passageRef={passageRef}
            highlights={highlights.length > 0 ? highlights : undefined}
            selectedSpan={tappedSpan}
            onSelectSpan={setTappedSpan}
          />
          <QuestionMediaBlock media={current?.media} placement="stem" className="mt-4" />
        </div>
      </div>

      {/* Right: Question */}
      <div className="lg:flex-1 min-w-0">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="mb-4 rounded-lg border border-border px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-foreground font-medium">
              Tap a sentence in the passage to select it, or highlight the exact words, then submit.
            </p>
            {timedMode ? (
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                  !feedback && QUESTION_TIME_LIMIT_SECONDS - questionSeconds <= 10
                    ? "bg-destructive-muted text-destructive border border-destructive"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
                aria-live="polite"
              >
                <span aria-hidden>⏱</span>
                {Math.max(0, QUESTION_TIME_LIMIT_SECONDS - questionSeconds)}s left
              </span>
            ) : (
              questionSeconds > QUESTION_TIME_LIMIT_SECONDS && (
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-warning-muted border border-warning px-3 py-1 text-xs font-semibold text-foreground tabular-nums"
                  aria-live="polite"
                >
                  <span aria-hidden>⏱</span>
                  +{questionSeconds - QUESTION_TIME_LIMIT_SECONDS}s over
                </span>
              )
            )}
          </div>

          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="text-foreground font-semibold text-lg">
              {current.questionText}
            </h3>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <span aria-hidden>🚩</span>
              Report question
            </button>
          </div>
          <QuestionMediaBlock media={current.media} placement="question" className="mb-4" />

          {!feedback ? (
            <>
              {emptySelectionError && (
                <p className="text-sm text-destructive mb-3 bg-destructive-muted border border-destructive rounded-lg px-3 py-2">
                  Please select part of the passage before submitting.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="min-h-[44px] px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="min-h-[44px] px-6 py-2.5 text-muted-foreground font-medium border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div
                className={`rounded-lg border p-4 ${
                  feedback.result === "correct"
                    ? "bg-training-success-muted border-training-success"
                    : feedback.result === "partial"
                    ? "bg-warning-muted border-warning"
                    : "bg-destructive-muted border-destructive"
                }`}
              >
                <p className="font-semibold text-foreground mb-1">
                  {feedback.result === "correct"
                    ? "Correct"
                    : feedback.result === "partial"
                    ? "Close"
                    : feedback.result === "skipped"
                    ? "Skipped"
                    : "Incorrect"}
                </p>
                {timedOut && (
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Time expired, so this question was submitted automatically.
                  </p>
                )}
                <p className="text-sm text-foreground">{feedback.explanation}</p>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-white/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <span aria-hidden>🚩</span>
                  Report this question
                </button>
                {(feedback.result === "incorrect" || feedback.result === "skipped" || feedback.result === "partial") && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Correct answer
                    </p>
                    <p className="text-sm">
                      <mark className="bg-emerald-200 border-l-2 border-emerald-600 text-emerald-900 pl-2 py-0.5 rounded-r font-medium">
                        {feedback.correctText}
                      </mark>
                    </p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Next question
              </button>
            </div>
          )}
        </div>
      </div>

      {questions.length > 0 && (
        <QuestionFeedbackModal
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          context={{
            trainerType,
            questionKind: "vr_inference",
            questionIdentifier: `inference:${passageId ?? "unknown"}:${current.id}`,
            passageId: passageId ?? undefined,
            sessionId: null,
          }}
        />
      )}
    </div>
  );
}
