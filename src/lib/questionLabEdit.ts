import {
  sanitizeQuestionContent,
  sanitizeStudentFacingCopy,
} from "./studentFacingCopy";
import { supabase } from "./supabase";

export type QuestionEditPatch = {
  stem?: string;
  explanation?: string;
  question?: string;
  options?: Record<"A" | "B" | "C" | "D", string>;
  contentPatch?: Record<string, unknown>;
};

function sanitizePatchStrings(patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      out[key] = sanitizeStudentFacingCopy(value);
    } else if (key === "wrongOptionReasons" && value && typeof value === "object") {
      const reasons: Record<string, string> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === "string") reasons[k] = sanitizeStudentFacingCopy(v);
      }
      out[key] = reasons;
    } else if (key === "review" && value && typeof value === "object") {
      const review: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        review[k] = typeof v === "string" ? sanitizeStudentFacingCopy(v) : v;
      }
      out[key] = review;
    } else if (key === "explanation" && value && typeof value === "object") {
      out[key] = sanitizeQuestionContent(
        { explanation: value } as Record<string, unknown>,
        "numeric",
      ).explanation;
    } else if (key === "items" && Array.isArray(value)) {
      out[key] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function saveTrainerQuestionEdit(
  id: string,
  patch: QuestionEditPatch,
  isActive: boolean,
  questionKind: string,
): Promise<void> {
  let contentPatch = patch.contentPatch
    ? sanitizePatchStrings(patch.contentPatch)
    : undefined;

  if (contentPatch && questionKind) {
    contentPatch = sanitizeQuestionContent(contentPatch, questionKind);
  }

  const payload = {
    p_id: id,
    p_stem: patch.stem != null ? sanitizeStudentFacingCopy(patch.stem) : null,
    p_explanation:
      patch.explanation != null ? sanitizeStudentFacingCopy(patch.explanation) : null,
    p_question: patch.question != null ? sanitizeStudentFacingCopy(patch.question) : null,
    p_options: patch.options ?? null,
    p_content_patch: contentPatch ?? null,
  };

  if (isActive) {
    payload.p_stem = null;
    payload.p_question = null;
    payload.p_options = null;
  }

  const { error } = await supabase.rpc("admin_update_trainer_question", payload);
  if (error) {
    const msg = error.message ?? "Save failed.";
    if (msg.includes("schema cache")) {
      throw new Error(
        `${msg} The database function exists but the API cache is stale. Wait a minute and try again, or reload the schema in Supabase Dashboard (Settings → API).`,
      );
    }
    throw new Error(msg);
  }
}
