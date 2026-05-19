import QuestionMediaBlock from "../media/QuestionMediaBlock";
import type { QuestionMedia } from "../../types/questionMedia";

type ReReadPassageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  passageText: string;
  passageMedia?: QuestionMedia[];
};

export default function ReReadPassageModal({
  isOpen,
  onClose,
  passageText,
  passageMedia,
}: ReReadPassageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reread-modal-title"
    >
      <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col font-ucat">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id="reread-modal-title" className="text-[22px] font-bold text-ucat-title">
            Re-read passage
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-muted-foreground -m-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 text-[15px] leading-[1.6] text-ucat-body">
          <QuestionMediaBlock media={passageMedia} placement="stem" className="mb-4" />
          {passageText}
        </div>
        <div className="p-4 border-t border-border">
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
