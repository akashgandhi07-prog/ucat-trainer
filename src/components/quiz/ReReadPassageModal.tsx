type ReReadPassageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  passageText: string;
};

export default function ReReadPassageModal({
  isOpen,
  onClose,
  passageText,
}: ReReadPassageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reread-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col font-ucat">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="reread-modal-title" className="text-[22px] font-bold text-ucat-title">
            Re-read passage
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 -m-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 text-[15px] leading-[1.6] text-ucat-body">
          {passageText}
        </div>
        <div className="p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
