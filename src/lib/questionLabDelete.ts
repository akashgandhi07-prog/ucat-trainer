import { supabase } from "./supabase";

export type BulkDeleteResult = {
  deleted: number;
  skipped: number;
  errors: { id: string; message: string }[];
};

export function formatBulkDeleteMessage(result: BulkDeleteResult): string | null {
  if (result.deleted === 0 && result.skipped === 0) return null;

  const parts: string[] = [];
  if (result.deleted > 0) {
    parts.push(`Deleted ${result.deleted} question${result.deleted !== 1 ? "s" : ""}.`);
  }
  if (result.skipped > 0) {
    parts.push(`${result.skipped} could not be deleted.`);
    const detail = result.errors
      .map((entry) => entry.message)
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");
    if (detail) parts.push(detail);
  }
  return parts.join(" ");
}

export function isDeletableQuestion(status: QuestionRowStatus): boolean {
  return status === "draft" || status === "archived";
}

type QuestionRowStatus = "draft" | "active" | "archived";

export async function deleteTrainerQuestion(id: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_trainer_question", { p_id: id });
  if (error) throw error;
}

export async function deleteTrainerQuestions(ids: string[]): Promise<BulkDeleteResult> {
  const { data, error } = await supabase.rpc("admin_delete_trainer_questions", {
    p_ids: ids,
  });
  if (error) throw error;

  const result = (data ?? {}) as {
    deleted?: number;
    skipped?: number;
    errors?: { id: string; message: string }[];
  };

  return {
    deleted: result.deleted ?? 0,
    skipped: result.skipped ?? 0,
    errors: Array.isArray(result.errors) ? result.errors : [],
  };
}
