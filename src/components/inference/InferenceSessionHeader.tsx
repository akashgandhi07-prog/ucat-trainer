import * as Dialog from "@radix-ui/react-dialog";

type InferenceSessionHeaderProps = {
  elapsedSeconds: number;
  correct: number;
  total: number;
  currentIndex: number;
  questionCount: number;
  onEndSession: () => void;
  showEndConfirm: boolean;
  onConfirmEnd: () => void;
  onCancelEnd: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function InferenceSessionHeader({
  elapsedSeconds,
  correct,
  total,
  currentIndex,
  questionCount,
  onEndSession,
  showEndConfirm,
  onConfirmEnd,
  onCancelEnd,
}: InferenceSessionHeaderProps) {
  const unanswered = questionCount - total;
  const isLongSession = elapsedSeconds >= 300;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onEndSession}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100"
              aria-label="End session"
            >
              <span aria-hidden>×</span>
              End session
            </button>
            <span className="text-sm text-slate-500 hidden sm:inline">
              Inference Trainer
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold tabular-nums ${
                  isLongSession ? "text-red-600" : "text-slate-900"
                }`}
                aria-live="polite"
              >
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Time
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {correct}/{total} correct
              </div>
              <div className="text-xs text-slate-500">
                Question {currentIndex + 1} of {questionCount}
              </div>
            </div>
          </div>
        </div>
      </header>

      <Dialog.Root open={showEndConfirm} onOpenChange={(open: boolean) => { if (!open) onCancelEnd(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 outline-none"
            aria-labelledby="end-session-title"
          >
            <Dialog.Title id="end-session-title" className="text-lg font-semibold text-slate-900 mb-2">
              End session?
            </Dialog.Title>
            <p className="text-slate-600 text-sm mb-6">
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered !== 1 ? "s" : ""}. Your progress will be saved.`
                : "Your progress will be saved."}
            </p>
            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={onConfirmEnd}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                End session
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
