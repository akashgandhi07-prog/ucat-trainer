import { useState, useCallback, useRef, useEffect } from "react";
import SelectablePassage, {
  getSelectionFromPassage,
} from "./SelectablePassage";
import { compareSelection, getSpanText } from "../../utils/inferenceComparison";
import type {
  InferenceQuestion,
  InferenceBreakdownItem,
  TextSpan,
  InferenceAnswerResult,
} from "../../types/inference";

type InferenceQuizProps = {
  passageText: string;
  questions: InferenceQuestion[];
  onComplete: (
    correct: number,
    total: number,
    breakdown: InferenceBreakdownItem[]
  ) => void;
  onProgressChange?: (correct: number, total: number, currentIndex: number) => void;
  onBreakdownChange?: (breakdown: InferenceBreakdownItem[]) => void;
};

export default function InferenceQuiz({
  passageText,
  questions,
  onComplete,
  onProgressChange,
  onBreakdownChange,
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
    const userSpan = getSelectionFromPassage(passageRef, passageText);

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
  }, [current, currentIndex, passageText]);

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

  const handleNext = useCallback(() => {
    setFeedback(null);
    setEmptySelectionError(false);
    if (isLastQuestion) {
      const total = questions.length;
      const correct = [...answers.values()].filter(
        (a) => a.result === "correct" || a.result === "partial"
      ).length;
      const breakdown = [...answers.values()];
      onComplete(correct, total, breakdown);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastQuestion, questions.length, answers, onComplete]);

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
        <p className="text-slate-600">
          No inference questions available for this passage.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Left: Passage */}
      <div className="lg:w-[48%] flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-h-[70vh] overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Passage
          </h3>
          <SelectablePassage
            passageText={passageText}
            passageRef={passageRef}
            highlights={highlights.length > 0 ? highlights : undefined}
          />
        </div>
      </div>

      {/* Right: Question */}
      <div className="lg:flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4 rounded-lg bg-blue-100 border border-blue-300 px-4 py-3">
            <p className="text-sm text-blue-900 font-medium">
              Please select the relevant section(s) of text as requested below.
            </p>
          </div>

          <h3 className="text-slate-800 font-semibold text-lg mb-4">
            {current.questionText}
          </h3>

          {!feedback ? (
            <>
              {emptySelectionError && (
                <p className="text-sm text-red-600 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Please select part of the passage before submitting.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="min-h-[44px] px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="min-h-[44px] px-6 py-2.5 text-slate-600 font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
                    ? "bg-emerald-50 border-emerald-200"
                    : feedback.result === "partial"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="font-semibold text-slate-900 mb-1">
                  {feedback.result === "correct"
                    ? "Correct"
                    : feedback.result === "partial"
                    ? "Close"
                    : feedback.result === "skipped"
                    ? "Skipped"
                    : "Incorrect"}
                </p>
                <p className="text-sm text-slate-700">{feedback.explanation}</p>
                {(feedback.result === "incorrect" || feedback.result === "skipped" || feedback.result === "partial") && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
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
                className="min-h-[44px] px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isLastQuestion ? "Finish" : "Next question"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
