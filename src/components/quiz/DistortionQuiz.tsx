import { useMemo, useState, useCallback, useEffect } from "react";
import ReReadPassageModal from "./ReReadPassageModal";
import QuestionFeedbackModal from "../feedback/QuestionFeedbackModal";
import type { TrainingType } from "../../types/training";
import {
  NUM_QUESTIONS,
  buildQuestions,
  type AnswerValue,
  type CorrectAnswer,
  type QuestionBreakdownItem,
} from "../../utils/distortionEngine";

// The question engine lives in ../../utils/distortionEngine so it can be run
// headlessly by npm run verify:distortion.

type DistortionQuizProps = {
  passageText: string;
  passageTitle?: string;
  onComplete: (correct: number, total: number, breakdown: QuestionBreakdownItem[]) => void;
  allowReRead?: boolean;
  questionCount?: number;
  trainerType: TrainingType;
  passageId: string;
};
export default function DistortionQuiz({
  passageText,
  passageTitle,
  onComplete,
  allowReRead = true,
  questionCount = NUM_QUESTIONS,
  trainerType,
  passageId,
}: DistortionQuizProps) {
  const questions = useMemo(() => buildQuestions(passageText, questionCount, passageTitle), [passageText, questionCount, passageTitle]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>(() =>
    Array(questions.length).fill(null)
  );
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showReRead, setShowReRead] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const current = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

  const handleAnswer = useCallback(
    (choice: AnswerValue) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = choice;
        return next;
      });
    },
    [currentIndex]
  );

  const handleFinish = useCallback(() => {
    let correct = 0;
    const ANSWER_LABELS: Record<CorrectAnswer, string> = {
      true: "True",
      false: "False",
      cant_tell: "Can't Tell",
    };
    const breakdown: QuestionBreakdownItem[] = questions.map((q, i) => {
      if (q.kind === "mc") {
        const picked = typeof answers[i] === "number" ? (answers[i] as number) : null;
        const isCorrect = picked === q.correctIndex;
        if (isCorrect) correct++;
        const pickedOption = picked != null ? q.options[picked] : null;
        const trueOption = q.options[q.correctIndex];
        // Map the MC result onto the existing breakdown shape so results screens
        // (ResultsView in Reader/Rapid Recall) render meaningful feedback without changes:
        // the shown statement is the option the student chose, judged true/false.
        return {
          statement: pickedOption
            ? `Best supported by the passage: "${pickedOption.text}"`
            : q.prompt,
          correctAnswer: isCorrect,
          correctAnswerRaw: (isCorrect ? "true" : "false") as CorrectAnswer,
          userAnswer: "true" as const,
          correctAnswerLabel: isCorrect
            ? "True"
            : `The best supported statement was: "${trueOption.text}"`,
          passageSnippet: pickedOption?.sourceSentence ?? trueOption.sourceSentence,
          distortionLabel: pickedOption?.distortionLabel,
          originalFragment: pickedOption?.originalFragment,
          replacedFragment: pickedOption?.replacedFragment,
          mcOptions: q.options,
          mcSelectedIndex: picked,
          mcCorrectIndex: q.correctIndex,
        };
      }
      const raw = answers[i];
      const a: "true" | "false" | "cant_tell" =
        raw === "true" || raw === "false" ? raw : "cant_tell";
      if (a === q.correctAnswer) correct++;
      return {
        statement: q.displayedSentence,
        correctAnswer: q.correctAnswer === "true",
        correctAnswerRaw: q.correctAnswer,
        userAnswer: a,
        correctAnswerLabel: ANSWER_LABELS[q.correctAnswer],
        passageSnippet: q.passageSnippet,
        distortionLabel: q.distortionLabel,
        originalFragment: q.originalFragment,
        replacedFragment: q.replacedFragment,
      };
    });
    onComplete(correct, questions.length, breakdown);
  }, [questions, answers, onComplete]);

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Use event.code so shortcuts work on Mac (Option = Alt; Option+key yields different key value)
      if (e.altKey && e.code === "KeyN") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(questions.length - 1, i + 1));
      } else if (e.altKey && e.code === "KeyP") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.altKey && e.code === "KeyF") {
        e.preventDefault();
        toggleFlag();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [questions.length, toggleFlag]);

  const allAnswered = answers.every((a) => a !== null);

  if (questions.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 text-center font-ucat">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <span aria-hidden>⚠</span>
            COMPREHENSION CHECK
          </span>
          <h2 className="text-[22px] font-bold text-ucat-title mt-3">
            No questions for this passage
          </h2>
          <p className="text-ucat-body mt-1 text-[15px]">
            This passage doesn&apos;t have enough content to generate comprehension questions. You can continue to results.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onComplete(0, 0, [])}
          className="min-h-[44px] px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90"
        >
          Continue to results
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 font-ucat">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
          <span aria-hidden>⚠</span>
          COMPREHENSION CHECK
        </span>
        <h2 className="text-[22px] font-bold text-ucat-title mt-3">
          Answer the following statements
        </h2>
        <p className="text-ucat-body mt-1 text-[15px] leading-[1.5]">
          Based on the passage you just read, determine if each statement is True,
          False, or Can&apos;t Tell.
          {questions.some((q) => q.kind === "mc") && (
            <> One question asks you to pick the statement best supported by the passage.</>
          )}
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`min-w-[44px] min-h-[44px] rounded-lg font-medium text-[14px] inline-flex items-center justify-center relative ${i === currentIndex
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-foreground hover:bg-secondary"
              }`}
          >
            {i + 1}
            {flagged.has(i) && (
              <span className="absolute -top-1 -right-1 text-[10px]" aria-label="Flagged">🚩</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-medium text-ucat-muted">
            QUESTION {currentIndex + 1} OF {questions.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toggleFlag();
                setFeedbackOpen(true);
              }}
              className={`flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 min-h-[44px] rounded ${
                flagged.has(currentIndex)
                  ? "bg-amber-100 text-amber-800"
                  : "text-ucat-muted hover:bg-secondary"
              }`}
            >
              <span aria-hidden>🚩</span>
              Flag / report
            </button>
          </div>
        </div>
        {current?.kind === "mc" ? (
          <>
            <p className="text-[16px] leading-[1.5] text-ucat-body mb-6 font-normal">
              {current.prompt}
            </p>
            <div className="flex flex-col gap-3">
              {current.options.map((option, optIdx) => (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleAnswer(optIdx)}
                  className={`w-full min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body text-left flex items-start gap-3 ${answers[currentIndex] === optIdx
                    ? "border-slate-400 bg-secondary text-foreground"
                    : "border-border hover:bg-secondary"
                    }`}
                >
                  <span className="font-medium shrink-0" aria-hidden>
                    {String.fromCharCode(65 + optIdx)}.
                  </span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-[1.5] text-ucat-body mb-6 font-normal">
              {current?.displayedSentence}?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleAnswer("true")}
                className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "true"
                  ? "border-slate-400 bg-secondary text-foreground"
                  : "border-border hover:bg-secondary"
                  }`}
              >
                True
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("false")}
                className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "false"
                  ? "border-slate-400 bg-secondary text-foreground"
                  : "border-border hover:bg-secondary"
                  }`}
              >
                False
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("cant_tell")}
                className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${answers[currentIndex] === "cant_tell"
                  ? "border-slate-400 bg-secondary text-foreground"
                  : "border-border hover:bg-secondary"
                  }`}
              >
                Can&apos;t Tell
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="min-h-[44px] px-4 py-2 border border-border rounded-lg text-[15px] text-ucat-body hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ← Previous
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground text-[15px] rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!allAnswered) {
                  const unansweredIdx = answers.findIndex((a) => a === null);
                  if (
                    window.confirm(
                      `You haven't answered question ${unansweredIdx + 1}. Submit anyway?`
                    )
                  ) {
                    handleFinish();
                  }
                } else {
                  handleFinish();
                }
              }}
              className={`min-h-[44px] px-4 py-2 text-white text-[15px] rounded-lg flex items-center justify-center ${allAnswered
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-amber-600 text-white hover:bg-amber-700"
                }`}
            >
              {allAnswered ? "Finish" : "Finish (unanswered)"}
            </button>
          )}
        </div>
        <p className="text-[13px] text-ucat-muted">{answeredCount}/{questions.length} answered</p>
        {allowReRead && (
          <button
            type="button"
            onClick={() => setShowReRead(true)}
            className="min-h-[44px] text-[13px] text-ucat-muted hover:text-primary flex items-center justify-center gap-1 px-2"
          >
            <span aria-hidden>↻</span>
            Re-read passage (penalty applies)
          </button>
        )}
      </div>

      <ReReadPassageModal
        isOpen={showReRead}
        onClose={() => setShowReRead(false)}
        passageText={passageText}
      />

      {questions.length > 0 && (
        <QuestionFeedbackModal
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          context={{
            trainerType,
            questionKind: "vr_tfct",
            questionIdentifier: `distortion:${passageId}:${currentIndex}`,
            passageId,
            sessionId: null,
          }}
        />
      )}
    </div>
  );
}
