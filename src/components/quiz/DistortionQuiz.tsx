import { useMemo, useState, useCallback } from "react";
import ReReadPassageModal from "./ReReadPassageModal";

const QUALIFIER_WORDS = ["some", "many", "often", "could"];
const NUM_QUESTIONS = 3;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function sentenceHasQualifier(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return QUALIFIER_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(lower));
}

function getSentencesWithQualifier(text: string): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.filter(sentenceHasQualifier);
}

function swapQualifierToAll(sentence: string): string {
  const regex = /\b(some|many|often|could)\b/gi;
  return sentence.replace(regex, "All");
}

type Question = {
  displayedSentence: string;
  correctAnswer: boolean; // true = original (True), false = distorted (False)
  passageSnippet: string; // original sentence from passage - for highlighting in results
};

type AnswerChoice = "true" | "false" | "cant_tell" | null;

export type QuestionBreakdownItem = {
  statement: string;
  correctAnswer: boolean;
  userAnswer: "true" | "false" | "cant_tell";
  correctAnswerLabel: string;
  passageSnippet?: string; // excerpt from passage that contains the answer
};

type DistortionQuizProps = {
  passageText: string;
  onComplete: (correct: number, total: number, breakdown: QuestionBreakdownItem[]) => void;
  allowReRead?: boolean;
  questionCount?: number;
};

function buildQuestions(passageText: string, count: number): Question[] {
  const trimmed = passageText.trim();
  if (trimmed.length === 0) return [];
  const candidates = getSentencesWithQualifier(trimmed);
  const fallback = trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const pool = candidates.length > 0 ? candidates : fallback;
  if (pool.length === 0) return [];
  const num = Math.max(1, Math.min(3, count));
  const shuffled = shuffle(pool);
  const questions: Question[] = [];
  for (let i = 0; i < num; i++) {
    const sentence = shuffled[i % shuffled.length];
    const isOriginal = Math.random() < 0.5;
    questions.push({
      displayedSentence: sentenceHasQualifier(sentence) ? (isOriginal ? sentence : swapQualifierToAll(sentence)) : sentence,
      correctAnswer: isOriginal,
      passageSnippet: sentence,
    });
  }
  return questions;
}

export default function DistortionQuiz({
  passageText,
  onComplete,
  allowReRead = true,
  questionCount = NUM_QUESTIONS,
}: DistortionQuizProps) {
  const questions = useMemo(() => buildQuestions(passageText, questionCount), [passageText, questionCount]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerChoice[]>(() =>
    Array(questions.length).fill(null)
  );
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [showReRead, setShowReRead] = useState(false);

  const current = questions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

  const handleAnswer = useCallback(
    (choice: AnswerChoice) => {
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
    const breakdown: QuestionBreakdownItem[] = questions.map((q, i) => {
      const a = answers[i] ?? "cant_tell";
      if (a === "true" && q.correctAnswer) correct++;
      else if (a === "false" && !q.correctAnswer) correct++;
      return {
        statement: q.displayedSentence,
        correctAnswer: q.correctAnswer,
        userAnswer: a,
        correctAnswerLabel: q.correctAnswer ? "True" : "False",
        passageSnippet: q.passageSnippet,
      };
    });
    onComplete(correct, questions.length, breakdown);
  }, [questions, answers, onComplete]);

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

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
          className="min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
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
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIndex(i)}
            className={`min-w-[44px] min-h-[44px] rounded-lg font-medium text-[14px] inline-flex items-center justify-center ${
              i === currentIndex
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-medium text-ucat-muted">
            QUESTION {currentIndex + 1} OF {questions.length}
          </span>
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex items-center justify-center gap-1.5 text-[13px] px-3 py-2 min-h-[44px] rounded ${
              flagged.has(currentIndex)
                ? "bg-amber-100 text-amber-800"
                : "text-ucat-muted hover:bg-slate-100"
            }`}
          >
            <span aria-hidden>🚩</span>
            Flag
          </button>
        </div>
        <p className="text-[16px] leading-[1.5] text-ucat-body mb-6 font-normal">
          {current?.displayedSentence}?
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleAnswer("true")}
            className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${
              answers[currentIndex] === "true"
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            True
          </button>
          <button
            type="button"
            onClick={() => handleAnswer("false")}
            className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${
              answers[currentIndex] === "false"
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            False
          </button>
          <button
            type="button"
            onClick={() => handleAnswer("cant_tell")}
            className={`flex-1 min-h-[44px] px-4 py-3 rounded-lg border-2 font-normal text-[15px] text-ucat-body ${
              answers[currentIndex] === "cant_tell"
                ? "border-slate-400 bg-slate-100 text-slate-800"
                : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            Can&apos;t Tell
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="min-h-[44px] px-4 py-2 border border-slate-200 rounded-lg text-[15px] text-ucat-body hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            ← Previous
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="min-h-[44px] px-4 py-2 bg-slate-900 text-white text-[15px] rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              Next →
            </button>
          ) : allAnswered ? (
            <button
              type="button"
              onClick={handleFinish}
              className="min-h-[44px] px-4 py-2 bg-blue-600 text-white text-[15px] rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              Finish
            </button>
          ) : null}
        </div>
        <p className="text-[13px] text-ucat-muted">{answeredCount}/{questions.length} answered</p>
        {allowReRead && (
          <button
            type="button"
            onClick={() => setShowReRead(true)}
            className="min-h-[44px] text-[13px] text-ucat-muted hover:text-blue-600 flex items-center justify-center gap-1 px-2"
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
    </div>
  );
}
