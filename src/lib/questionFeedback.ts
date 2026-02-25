import { z } from "zod";
import { supabase } from "./supabase";
import { supabaseLog } from "./logger";
import type { TrainingType } from "../types/training";

export const QUESTION_FEEDBACK_COMMENT_MAX = 1000;
const PAGE_URL_MAX = 255;

export const questionFeedbackIssueTypes = [
  "wrong_answer",
  "unclear_wording",
  "too_hard",
  "too_easy",
  "typo",
  "other",
] as const;

export type QuestionFeedbackIssueType = (typeof questionFeedbackIssueTypes)[number];

export type QuestionFeedbackKind = "dm_syllogism" | "vr_tfct" | "vr_inference";

export type QuestionFeedbackTrainerType = TrainingType | "syllogism_micro" | "syllogism_macro";

export const questionFeedbackSchema = z.object({
  trainerType: z.string().min(1, "Missing trainer type."),
  questionKind: z.enum(["dm_syllogism", "vr_tfct", "vr_inference"]),
  questionIdentifier: z
    .string()
    .min(1, "Missing question identifier.")
    .max(255, "Question identifier is too long."),
  issueType: z.enum(questionFeedbackIssueTypes),
  comment: z
    .string()
    .max(
      QUESTION_FEEDBACK_COMMENT_MAX,
      `Comment must be ${QUESTION_FEEDBACK_COMMENT_MAX} characters or fewer.`
    )
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    }),
  passageId: z.string().max(255).optional(),
  sessionId: z.string().uuid("Invalid session id.").optional(),
  pageUrl: z
    .string()
    .max(PAGE_URL_MAX, `Page URL must be ${PAGE_URL_MAX} characters or fewer.`)
    .optional(),
});

export type QuestionFeedbackInput = z.infer<typeof questionFeedbackSchema>;

export type QuestionFeedbackSubmitPayload = QuestionFeedbackInput & {
  userId?: string | null;
};

function normalisePageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  let candidate = trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      candidate = url.pathname + url.search;
    } catch {
      candidate = trimmed;
    }
  } else if (!trimmed.startsWith("/")) {
    candidate = `/${trimmed}`;
  }
  return candidate.slice(0, PAGE_URL_MAX);
}

export async function submitQuestionFeedback(
  payload: QuestionFeedbackSubmitPayload
): Promise<{ success: true } | { success: false; error: string }> {
  const { userId, ...rest } = payload;
  const parsed = questionFeedbackSchema.safeParse(rest);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid feedback.";
    return { success: false, error: firstError };
  }

  const data = parsed.data;
  const pageUrl = normalisePageUrl(data.pageUrl);

  const { error } = await supabase.from("question_feedback").insert({
    user_id: userId ?? null,
    trainer_type: data.trainerType,
    question_kind: data.questionKind,
    question_identifier: data.questionIdentifier,
    issue_type: data.issueType,
    comment: data.comment ?? null,
    passage_id: data.passageId ?? null,
    session_id: data.sessionId ?? null,
    page_url: pageUrl ?? null,
  });

  if (error) {
    supabaseLog.error("Question feedback insert failed", {
      message: error.message,
      code: error.code,
    });
    return { success: false, error: "Failed to send. Please try again." };
  }

  return { success: true };
}

