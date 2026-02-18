import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { supabaseLog } from "../../lib/logger";

export type FeedbackType = "bug" | "suggestion";

type BugReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const RATE_LIMIT_MS = 60000; // 1 minute
const RATE_LIMIT_KEY = "last_bug_report_timestamp";

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const { user } = useAuth();
  const DESCRIPTION_MAX = 3000;
  const PAGE_URL_MAX = 255;
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Honeypot field for spam prevention
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const rateLimitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setPageUrl(window.location.pathname + window.location.search);

      // Check rate limit
      const lastSubmit = localStorage.getItem(RATE_LIMIT_KEY);
      if (lastSubmit) {
        const elapsed = Date.now() - parseInt(lastSubmit, 10);
        if (elapsed < RATE_LIMIT_MS) {
          const remaining = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
          setRateLimitRemaining(remaining);

          // Update countdown every second
          rateLimitTimerRef.current = setInterval(() => {
            const newElapsed = Date.now() - parseInt(lastSubmit, 10);
            if (newElapsed >= RATE_LIMIT_MS) {
              setRateLimitRemaining(null);
              if (rateLimitTimerRef.current) {
                clearInterval(rateLimitTimerRef.current);
              }
            } else {
              setRateLimitRemaining(Math.ceil((RATE_LIMIT_MS - newElapsed) / 1000));
            }
          }, 1000);
        }
      }
    }

    return () => {
      if (rateLimitTimerRef.current) {
        clearInterval(rateLimitTimerRef.current);
      }
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      supabaseLog.warn("Bug report blocked: honeypot triggered");
      setStatus("success");
      setMessage("Thanks! Your feedback has been sent.");
      setTimeout(() => onClose(), 1500);
      return;
    }

    // Rate limit check
    if (rateLimitRemaining !== null && rateLimitRemaining > 0) {
      setStatus("error");
      setMessage(`Please wait ${rateLimitRemaining} seconds before submitting again.`);
      return;
    }

    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }

    const rawPageUrl = pageUrl.trim();
    let normalizedPageUrl: string | null = null;
    if (rawPageUrl !== "") {
      let candidate = rawPageUrl;
      if (rawPageUrl.startsWith("http://") || rawPageUrl.startsWith("https://")) {
        try {
          const url = new URL(rawPageUrl);
          candidate = url.pathname + url.search;
        } catch {
          candidate = rawPageUrl;
        }
      } else if (!rawPageUrl.startsWith("/")) {
        candidate = `/${rawPageUrl}`;
      }
      normalizedPageUrl = candidate.slice(0, PAGE_URL_MAX);
    }

    setStatus("loading");
    setMessage("");
    const { error } = await supabase.from("bug_reports").insert({
      user_id: user?.id ?? null,
      type: feedbackType,
      description: trimmed,
      page_url: normalizedPageUrl,
    });

    if (error) {
      supabaseLog.error("Feedback insert failed", { message: error.message, code: error.code });
      setStatus("error");
      setMessage("Failed to send. Please try again.");
      return;
    }

    // Set rate limit timestamp
    localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());

    setStatus("success");
    setMessage("Thanks! Your feedback has been sent.");
    setDescription("");
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setDescription("");
    setHoneypot("");
    setStatus("idle");
    setMessage("");
    setRateLimitRemaining(null);
    if (rateLimitTimerRef.current) {
      clearInterval(rateLimitTimerRef.current);
    }
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field - hidden from users, catches bots */}
          <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
            <label htmlFor="feedback-website">Website</label>
            <input
              id="feedback-website"
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

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
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={descriptionPlaceholder}
              rows={4}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              disabled={status === "loading"}
            />
            <p className="mt-1 text-xs text-slate-500">
              {description.length}/{DESCRIPTION_MAX} characters
            </p>
          </div>
          <div>
            <label htmlFor="feedback-page" className="block text-sm font-medium text-slate-700 mb-1">
              {pageLabel}
            </label>
            <input
              id="feedback-page"
              type="text"
              maxLength={PAGE_URL_MAX}
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
              disabled={status === "loading" || !description.trim() || (rateLimitRemaining !== null && rateLimitRemaining > 0)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {rateLimitRemaining !== null && rateLimitRemaining > 0
                ? `Wait ${rateLimitRemaining}s`
                : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
