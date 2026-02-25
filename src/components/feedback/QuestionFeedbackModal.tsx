import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../../hooks/useAuth";
import { trackEvent } from "../../lib/analytics";
import {
  QUESTION_FEEDBACK_COMMENT_MAX,
  questionFeedbackIssueTypes,
  type QuestionFeedbackTrainerType,
  type QuestionFeedbackKind,
  submitQuestionFeedback,
} from "../../lib/questionFeedback";

export type QuestionFeedbackContext = {
  trainerType: QuestionFeedbackTrainerType;
  questionKind: QuestionFeedbackKind;
  questionIdentifier: string;
  passageId?: string | null;
  sessionId?: string | null;
};

type QuestionFeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
  context: QuestionFeedbackContext;
};

type FormValues = {
  issueType: (typeof questionFeedbackIssueTypes)[number];
  comment?: string;
};

const RATE_LIMIT_SECONDS = 60;

function getRateLimitKey(ctx: QuestionFeedbackContext): string {
  return `question_feedback_last_${ctx.trainerType}_${ctx.questionIdentifier}`;
}

export default function QuestionFeedbackModal({
  isOpen,
  onClose,
  context,
}: QuestionFeedbackModalProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      issueType: "unclear_wording",
      comment: "",
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setStatus("idle");
    setMessage("");

    // Lightweight per-question rate limit per browser session.
    if (typeof window === "undefined") return;
    const key = getRateLimitKey(context);
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      setRateLimitRemaining(null);
      return;
    }
    const last = parseInt(raw, 10);
    if (Number.isNaN(last)) {
      setRateLimitRemaining(null);
      return;
    }
    const elapsed = Math.floor((Date.now() - last) / 1000);
    if (elapsed >= RATE_LIMIT_SECONDS) {
      setRateLimitRemaining(null);
      return;
    }
    setRateLimitRemaining(RATE_LIMIT_SECONDS - elapsed);
  }, [isOpen, context]);

  useEffect(() => {
    let timer: number | undefined;
    if (rateLimitRemaining != null && rateLimitRemaining > 0) {
      timer = window.setInterval(() => {
        setRateLimitRemaining((current) => {
          if (current == null) return current;
          if (current <= 1) {
            window.clearInterval(timer);
            return null;
          }
          return current - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [rateLimitRemaining]);

  const onSubmit = async (values: FormValues) => {
    if (rateLimitRemaining != null && rateLimitRemaining > 0) {
      setStatus("error");
      setMessage(
        `You’ve recently reported this question. Please wait ${rateLimitRemaining}s before sending another report.`
      );
      return;
    }

    setStatus("loading");
    setMessage("");

    const pageUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : undefined;

    const result = await submitQuestionFeedback({
      trainerType: context.trainerType,
      questionKind: context.questionKind,
      questionIdentifier: context.questionIdentifier,
      issueType: values.issueType,
      comment: values.comment,
      passageId: context.passageId ?? undefined,
      sessionId: context.sessionId ?? undefined,
      pageUrl,
      userId: user?.id ?? null,
    });

    if (!result.success) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    if (typeof window !== "undefined") {
      const key = getRateLimitKey(context);
      sessionStorage.setItem(key, String(Date.now()));
    }

    trackEvent("question_reported", {
      trainer_type: context.trainerType,
      question_kind: context.questionKind,
      issue_type: values.issueType,
    }).catch(() => {
      // analytics failure shouldn't affect UX
    });

    setStatus("success");
    setMessage("Thanks – we’ve logged this question for review.");
    reset({ issueType: values.issueType, comment: "" });

    window.setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleClose = () => {
    reset({ issueType: "unclear_wording", comment: "" });
    setStatus("idle");
    setMessage("");
    setRateLimitRemaining(null);
    onClose();
  };

  /* eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch() used intentionally for dynamic styling */
  const currentIssue = watch("issueType");

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl outline-none"
          aria-labelledby="question-feedback-title"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <Dialog.Title
              id="question-feedback-title"
              className="text-lg font-semibold text-slate-900"
            >
              Report this question
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-slate-400 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          <p className="mb-3 text-sm text-slate-600">
            Spot a problem or confusing wording? Send a quick report so we can
            review this item.
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            aria-describedby={
              message ? "question-feedback-status" : undefined
            }
          >
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                What&apos;s the main issue?
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {questionFeedbackIssueTypes.map((type) => {
                  const label =
                    type === "wrong_answer"
                      ? "Possible mistake"
                      : type === "unclear_wording"
                        ? "Unclear wording"
                        : type === "too_hard"
                          ? "Too hard"
                          : type === "too_easy"
                            ? "Too easy"
                            : type === "typo"
                              ? "Typo / formatting"
                              : "Other";
                  return (
                    <label
                      key={type}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        currentIssue === type
                          ? "border-primary bg-primary/5 text-slate-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value={type}
                        className="text-primary focus:ring-primary"
                        {...register("issueType")}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
              {errors.issueType && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.issueType.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="question-feedback-comment"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Optional comment
              </label>
              <textarea
                id="question-feedback-comment"
                rows={3}
                maxLength={QUESTION_FEEDBACK_COMMENT_MAX}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="E.g. the explanation contradicts the stimulus, or the wording feels ambiguous."
                {...register("comment")}
              />
              {errors.comment && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.comment.message}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Please don&apos;t include personal information.
              </p>
            </div>

            {message && (
              <p
                id="question-feedback-status"
                className={`text-sm ${
                  status === "error"
                    ? "text-destructive"
                    : "text-training-success"
                }`}
              >
                {message}
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  status === "loading" ||
                  (rateLimitRemaining != null && rateLimitRemaining > 0)
                }
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {rateLimitRemaining != null && rateLimitRemaining > 0
                  ? `Wait ${rateLimitRemaining}s`
                  : status === "loading"
                    ? "Sending…"
                    : "Send report"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

