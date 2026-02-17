import { useState } from "react";
import { Link } from "react-router-dom";
import type { QuestionBreakdownItem } from "./DistortionQuiz";

export type WpmRating =
  | "too_slow"
  | "slightly_slow"
  | "just_right"
  | "slightly_fast"
  | "too_fast";

type ResultsViewProps = {
  wpm: number;
  correct: number;
  total: number;
  passageTitle?: string;
  timeSpentSeconds?: number;
  questionBreakdown?: QuestionBreakdownItem[];
  onSaveProgress: (rating?: WpmRating) => void;
  saveError?: string | null;
  saving?: boolean;
};

function userAnswerLabel(a: "true" | "false" | "cant_tell"): string {
  if (a === "true") return "True";
  if (a === "false") return "False";
  return "Can't tell";
}

export default function ResultsView({
  wpm,
  correct,
  total,
  passageTitle,
  timeSpentSeconds = 0,
  questionBreakdown = [],
  onSaveProgress,
  saveError = null,
  saving = false,
}: ResultsViewProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const [wpmRating, setWpmRating] = useState<WpmRating | null>(null);

  const handleSave = () => {
    onSaveProgress(wpmRating ?? undefined);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 text-center">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-green-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          DRILL COMPLETE
        </span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Performance Analytics
      </h1>
      <p className="text-slate-600 text-sm mb-8">
        Speed Reading{passageTitle ? ` · ${passageTitle}` : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Speed
          </p>
          <p className="text-2xl font-bold text-slate-900">{wpm}</p>
          <p className="text-sm text-slate-600">WPM</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Accuracy
          </p>
          <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
          <p className="text-sm text-slate-600">
            {correct}/{total} correct
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Time spent
          </p>
          <p className="text-2xl font-bold text-slate-900">{timeSpentSeconds}</p>
          <p className="text-sm text-slate-600">seconds</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-sm text-slate-700">
          {accuracy >= 80
            ? "Good comprehension at this speed. Try +25 WPM next time to push your pace."
            : "Comprehension was lower; try the same or slightly lower WPM next time and focus on key sentences."}
        </p>
        {wpmRating === "just_right" && accuracy >= 80 && (
          <p className="text-sm text-slate-600 mt-2">Great — we&apos;ll keep suggesting this range.</p>
        )}
      </div>

      {questionBreakdown.length > 0 && (
        <div className="mb-8 text-left">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Question breakdown
          </h2>
          <div className="space-y-3">
            {questionBreakdown.map((item, i) => {
              const isCorrect =
                (item.userAnswer === "true" && item.correctAnswer) ||
                (item.userAnswer === "false" && !item.correctAnswer);
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900">{i + 1}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        isCorrect
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <span aria-hidden>✓</span> Correct
                        </>
                      ) : (
                        <>
                          <span aria-hidden>✕</span> Incorrect
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-slate-800 mb-2">{item.statement}?</p>
                  <p className="text-sm text-slate-600">
                    Your answer: {userAnswerLabel(item.userAnswer)}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-red-700 mt-0.5">
                      Correct answer: {item.correctAnswerLabel}
                    </p>
                  )}
                  {item.passageSnippet && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                        From the passage
                      </p>
                      <p className="text-sm text-slate-700 bg-amber-50/80 border-l-2 border-amber-400 pl-3 py-1.5 rounded-r">
                        {item.passageSnippet}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {saveError}
        </p>
      )}
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-700 mb-2">
          How did this pace feel?
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {(
            [
              ["too_slow", "Too slow"],
              ["slightly_slow", "Slightly slow"],
              ["just_right", "Just right"],
              ["slightly_fast", "Slightly fast"],
              ["too_fast", "Too fast"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setWpmRating(value)}
              className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                wpmRating === value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        aria-busy={saving}
        className="min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          "Save Progress"
        )}
      </button>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-slate-500 hover:text-blue-600">
          Back to Home
        </Link>
        <Link
          to="/?mode=speed_reading"
          className="min-h-[44px] inline-flex items-center justify-center py-2 text-slate-500 hover:text-blue-600"
        >
          Try another drill
        </Link>
      </div>
    </div>
  );
}
