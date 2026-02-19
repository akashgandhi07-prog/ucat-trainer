import { useState } from "react";
import type { InferenceBreakdownItem } from "../../types/inference";

type InferenceResultsViewProps = {
  correct: number;
  total: number;
  timeSeconds: number;
  passageTitle?: string;
  passageText?: string;
  breakdown: InferenceBreakdownItem[];
  onRestart: () => void;
  saveError?: string | null;
  saving?: boolean;
};

export default function InferenceResultsView({
  correct,
  total,
  timeSeconds,
  passageTitle,
  passageText,
  breakdown,
  onRestart,
  saveError = null,
  saving = false,
}: InferenceResultsViewProps) {
  const [passageModalOpen, setPassageModalOpen] = useState(false);
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 text-center">
      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-green-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          SESSION COMPLETE
        </span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">
        Inference Trainer - Results
      </h1>
      <p className="text-slate-600 text-sm mb-8">
        {passageTitle ? passageTitle : "Session complete"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
            Score
          </p>
          <p className="text-2xl font-bold text-slate-900">{correct}</p>
          <p className="text-sm text-slate-600">of {total} questions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Time
          </p>
          <p className="text-2xl font-bold text-slate-900">{timeSeconds}</p>
          <p className="text-sm text-slate-600">seconds</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
        <p className="text-sm text-slate-700">
          {accuracy >= 80
            ? "Strong inference skills. Focus on narrowing to the precise sentence that supports the conclusion."
            : "Inference questions require identifying the exact evidence. Look for the sentence that directly answers the question."}
        </p>
      </div>

      {passageText && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setPassageModalOpen(true)}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors inline-flex items-center justify-center gap-2"
          >
            View passage
          </button>
          {passageModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="passage-modal-title"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                  <h2 id="passage-modal-title" className="text-lg font-semibold text-slate-900">
                    Passage
                  </h2>
                  <button
                    type="button"
                    onClick={() => setPassageModalOpen(false)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 text-[15px] leading-[1.6] text-slate-800 whitespace-pre-wrap">
                  {passageText}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {breakdown.length > 0 && (
        <div className="mb-8 text-left">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Question breakdown
          </h2>
          <div className="space-y-3">
            {breakdown.map((item, i) => {
              const isCorrect =
                item.result === "correct" || item.result === "partial";
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    isCorrect
                      ? "bg-training-success-muted border-training-success"
                      : "bg-destructive-muted border-destructive"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900">Q{i + 1}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        isCorrect
                          ? "bg-training-success-muted text-training-success"
                          : "bg-destructive-muted text-destructive"
                      }`}
                    >
                      {item.result === "correct"
                        ? "Correct"
                        : item.result === "partial"
                        ? "Close"
                        : item.result === "skipped"
                        ? "Skipped"
                        : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-slate-800 mb-2 font-medium">{item.questionText}</p>
                  {item.userText && (
                    <p className="text-sm text-slate-600 mb-1">
                      Your selection: &quot;{item.userText.length > 80 ? item.userText.slice(0, 80) + "…" : item.userText}&quot;
                    </p>
                  )}
                  <p className="text-sm text-slate-700 mt-2">{item.explanation}</p>
                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      Correct answer
                    </p>
                    <p className="text-sm">
                      <mark className="bg-emerald-200 border-l-2 border-emerald-600 text-emerald-900 pl-2 py-0.5 rounded-r font-medium">
                        {item.correctText.length > 120
                          ? item.correctText.slice(0, 120) + "…"
                          : item.correctText}
                      </mark>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mb-4 text-sm text-destructive bg-destructive-muted border border-destructive rounded-lg px-4 py-2">
          {saveError}
        </p>
      )}
      {saving && (
        <p className="mb-4 text-sm text-slate-600 inline-flex items-center gap-2" aria-live="polite">
          <span
            className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
          Saving…
        </p>
      )}

      <button
        type="button"
        onClick={onRestart}
        disabled={saving}
        className="min-h-[44px] px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        Try another passage
      </button>
      <div className="mt-6">
        <a
          href="/"
          className="min-h-[44px] inline-flex items-center justify-center py-2 text-sm text-slate-500 hover:text-blue-600"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
