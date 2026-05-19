import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { supabaseLog } from "../../lib/logger";
import { trackEvent } from "../../lib/analytics";
import { feedbackSchema, type FeedbackFormData } from "../../lib/feedbackSchema";
import { useToast } from "../../contexts/ToastContext";

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
  const { showToast } = useToast();
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
        } else {
          setRateLimitRemaining(null);
        }
      } else {
        setRateLimitRemaining(null);
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
    let insertError: { message: string; code?: string } | null = null;
    try {
      const { error } = await supabase.from("bug_reports").insert({
        user_id: user?.id ?? null,
        type: data.feedbackType,
        description: trimmed,
        page_url: normalizedPageUrl,
      });
      insertError = error;
    } catch (err) {
      supabaseLog.error("Feedback insert threw", {
        message: err instanceof Error ? err.message : String(err),
      });
      insertError = { message: "network", code: "exception" };
    }

    if (insertError) {
      supabaseLog.error("Feedback insert failed", {
        message: insertError.message,
        code: insertError.code,
      });
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
  const descriptionLabel = isBug ? "What happened?" : "What would you like to suggest?";
  const descriptionPlaceholder = isBug
    ? "Describe what you were doing and what you saw. The more detail, the easier it is to fix."
    : "Describe your idea or improvement...";
  const pageLabel = isBug ? "Where did it happen? (optional)" : "Where does this apply? (optional)";
  const submitLabel = status === "loading" ? "Sending…" : "Send feedback";

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-6 outline-none"
          aria-labelledby="feedback-modal-title"
        >
          {/* Header */}
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>💬</span>
              <Dialog.Title id="feedback-modal-title" className="text-base font-semibold text-slate-900">
                Share your thoughts
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close"
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          <p className="mb-4 text-sm text-slate-500 leading-relaxed">
            We read every message: bugs, rough edges, ideas. Your feedback
            genuinely shapes how this platform improves. Thank you for taking the time.
          </p>

        <form
          onSubmit={rhfHandleSubmit(onSubmit, (fieldErrors) => {
            const msg =
              fieldErrors.description?.message ??
              fieldErrors.pageUrl?.message ??
              fieldErrors.feedbackType?.message ??
              "Please fix the highlighted fields.";
            showToast(msg, {
              variant: "error",
              duration: 4500,
            });
            document.getElementById("feedback-description")?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          })}
          className="space-y-4"
        >
          {/* Honeypot - avoid labels like "Website" that password managers autofill */}
          <div className="pointer-events-none absolute left-[-9999px] top-0 opacity-0" aria-hidden="true">
            <label htmlFor="feedback-internal-ref">Internal reference</label>
            <input
              id="feedback-internal-ref"
              name="internal_ref"
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">What kind of feedback is this?</p>
            <div className="grid grid-cols-2 gap-2">
              {(["bug", "suggestion"] as const).map((type) => {
                const icon = type === "bug" ? "🐛" : "💡";
                const label = type === "bug" ? "Found a bug" : "Got an idea";
                return (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                      feedbackType === type
                        ? "border-primary bg-primary/5 text-slate-900 font-medium"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input type="radio" value={type} className="sr-only" {...register("feedbackType")} />
                    <span aria-hidden className="text-base">{icon}</span>
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="feedback-description" className="mb-1 block text-sm font-medium text-slate-700">
              {descriptionLabel}
            </label>
            <textarea
              id="feedback-description"
              maxLength={DESCRIPTION_MAX}
              placeholder={descriptionPlaceholder}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              disabled={status === "loading"}
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              {(watch("description") ?? "").length}/{DESCRIPTION_MAX} characters
            </p>
          </div>

          <div>
            <label htmlFor="feedback-page" className="mb-1 block text-sm font-medium text-slate-700">
              {pageLabel}
            </label>
            <input
              id="feedback-page"
              type="text"
              maxLength={PAGE_URL_MAX}
              placeholder="/dashboard"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={status === "loading"}
              {...register("pageUrl")}
            />
            {errors.pageUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.pageUrl.message}</p>
            )}
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm rounded-lg px-3 py-2 ${
                status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "loading" || (rateLimitRemaining !== null && rateLimitRemaining > 0)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {rateLimitRemaining !== null && rateLimitRemaining > 0
                ? `Wait ${rateLimitRemaining}s`
                : submitLabel}
            </button>
          </div>
        </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Prefer email? Reach us at{" "}
            <a
              href="mailto:info@theukcatpeople.co.uk"
              className="text-slate-500 underline underline-offset-2 hover:text-slate-700 transition-colors"
            >
              info@theukcatpeople.co.uk
            </a>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
