import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { supabaseLog } from "../../lib/logger";

export type FeedbackType = "bug" | "suggestion";

type BugReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setPageUrl(window.location.pathname + window.location.search);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      onClose();
      return;
    }
    const trimmed = description.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage("");
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user.id,
      type: feedbackType,
      description: trimmed,
      page_url: pageUrl.trim() || null,
    });

    if (error) {
      supabaseLog.error("Feedback insert failed", { message: error.message, code: error.code });
      setStatus("error");
      setMessage("Failed to send. Please try again.");
      return;
    }
    setStatus("success");
    setMessage("Thanks! Your feedback has been sent.");
    setDescription("");
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setDescription("");
    setStatus("idle");
    setMessage("");
    onClose();
  };

  const isBug = feedbackType === "bug";
  const title = isBug ? "Report a bug" : "Suggest an improvement";
  const descriptionLabel = isBug ? "What went wrong?" : "What would you like to suggest?";
  const descriptionPlaceholder = isBug
    ? "Describe what you were doing and what happened..."
    : "Describe your idea or improvement...";
  const pageLabel = isBug ? "Where did it happen? (optional)" : "Where does this apply? (optional)";
  const submitLabel = status === "loading" ? "Sending…" : "Send feedback";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 id="feedback-modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 -m-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!user ? (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">Sign in to send feedback.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  openAuthModal();
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign in
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="block text-sm font-medium text-slate-700 mb-2">What would you like to send?</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="feedback-type"
                    value="bug"
                    checked={feedbackType === "bug"}
                    onChange={() => setFeedbackType("bug")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Report a bug</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="feedback-type"
                    value="suggestion"
                    checked={feedbackType === "suggestion"}
                    onChange={() => setFeedbackType("suggestion")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Suggest an improvement</span>
                </label>
              </div>
            </div>
            <div>
              <label htmlFor="feedback-description" className="block text-sm font-medium text-slate-700 mb-1">
                {descriptionLabel}
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={descriptionPlaceholder}
                rows={4}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label htmlFor="feedback-page" className="block text-sm font-medium text-slate-700 mb-1">
                {pageLabel}
              </label>
              <input
                id="feedback-page"
                type="text"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="/dashboard"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={status === "loading"}
              />
            </div>
            {message && (
              <p
                className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}
              >
                {message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading" || !description.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
