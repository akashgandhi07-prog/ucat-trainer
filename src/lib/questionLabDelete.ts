import { supabase } from "./supabase";

export type BulkDeleteResult = {
  deleted: number;
  skipped: number;
  errors: { id: string; message: string }[];
};

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
