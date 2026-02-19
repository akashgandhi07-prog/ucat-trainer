import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { supabaseLog } from "../../lib/logger";
import { trackEvent } from "../../lib/analytics";
import { feedbackSchema, type FeedbackFormData } from "../../lib/feedbackSchema";

export type FeedbackType = "bug" | "suggestion";

type BugReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const RATE_LIMIT_MS = 60000; // 1 minute
const RATE_LIMIT_KEY = "last_bug_report_timestamp";
const DESCRIPTION_MAX = 3000;
const PAGE_URL_MAX = 255;

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const { user } = useAuth();
  const [honeypot, setHoneypot] = useState(""); // Honeypot field for spam prevention
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const rateLimitTimerRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit: rhfHandleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedbackType: "bug",
      description: "",
      pageUrl: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      trackEvent("bug_report_opened");
      if (typeof window !== "undefined") {
        setValue("pageUrl", window.location.pathname + window.location.search);
      }
    }
  }, [isOpen, setValue]);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
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

  const onSubmit = async (data: FeedbackFormData) => {
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

    const trimmed = data.description.trim();

    const rawPageUrl = (data.pageUrl ?? "").trim();
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
      type: data.feedbackType,
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
    reset({ feedbackType: data.feedbackType, description: "", pageUrl: data.pageUrl ?? "" });
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    reset({ feedbackType: "bug", description: "", pageUrl: "" });
    setHoneypot("");
    setStatus("idle");
    setMessage("");
    setRateLimitRemaining(null);
    if (rateLimitTimerRef.current) {
      clearInterval(rateLimitTimerRef.current);
    }
    onClose();
  };

  /* eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() used intentionally for dynamic labels */
  const feedbackType = watch("feedbackType");
  const isBug = feedbackType === "bug";
  const title = isBug ? "Report a bug" : "Suggest an improvement";
  const descriptionLabel = isBug ? "What went wrong?" : "What would you like to suggest?";
  const descriptionPlaceholder = isBug
    ? "Describe what you were doing and what happened..."
    : "Describe your idea or improvement...";
  const pageLabel = isBug ? "Where did it happen? (optional)" : "Where does this apply? (optional)";
  const submitLabel = status === "loading" ? "Sending…" : "Send feedback";

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 outline-none"
          aria-labelledby="feedback-modal-title"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title id="feedback-modal-title" className="text-lg font-semibold text-slate-900">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 -m-2"
                aria-label="Close"
              >
                ×
              </button>
            </Dialog.Close>
          </div>

        <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4">
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
                  value="bug"
                  className="text-blue-600 focus:ring-blue-500"
                  {...register("feedbackType")}
                />
                <span className="text-sm text-slate-700">Report a bug</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="suggestion"
                  className="text-blue-600 focus:ring-blue-500"
                  {...register("feedbackType")}
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
              placeholder={descriptionPlaceholder}
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              disabled={status === "loading"}
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {(watch("description") ?? "").length}/{DESCRIPTION_MAX} characters
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
              placeholder="/dashboard"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={status === "loading"}
              {...register("pageUrl")}
            />
            {errors.pageUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.pageUrl.message}</p>
            )}
          </div>
          {message && (
            <p
              className={`text-sm ${status === "error" ? "text-destructive" : "text-training-success"}`}
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
              disabled={status === "loading" || (rateLimitRemaining !== null && rateLimitRemaining > 0)}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {rateLimitRemaining !== null && rateLimitRemaining > 0
                ? `Wait ${rateLimitRemaining}s`
                : submitLabel}
            </button>
          </div>
        </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
