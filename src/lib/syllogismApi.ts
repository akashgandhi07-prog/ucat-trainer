import { supabase } from "./supabase";
import type { SyllogismQuestion, LogicGroup } from "../types/syllogisms";
import { normaliseQuestionMedia } from "../types/questionMedia";

function toErrorMessage(e: unknown): string {
  if (isAbortError(e)) {
    return "Failed to load syllogism questions. Please try again or check your connection.";
  }
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e.trim().length > 0) return e;
  if (
    e &&
    typeof e === "object" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return "Failed to load syllogism questions. Please try again or check your connection.";
}

export function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  if (typeof e === "object" && e !== null && "name" in e && (e as { name: string }).name === "AbortError") {
    return true;
  }
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message)
        : "";
  return msg.includes("AbortError") || msg.includes("signal is aborted");
}

function mapRow(row: Record<string, unknown>): SyllogismQuestion | null {
  const id = row.id;
  const stimulus_text = row.stimulus_text;
  const conclusion_text = row.conclusion_text;
  if (typeof id !== "string" || typeof stimulus_text !== "string" || typeof conclusion_text !== "string") {
    return null;
  }
  const macro_block_id =
    typeof row.macro_block_id === "string" ? row.macro_block_id : id;
  return {
    id,
    macro_block_id,
    stimulus_text,
    conclusion_text,
    is_correct: Boolean(row.is_correct),
    logic_group: row.logic_group as LogicGroup,
    trick_type: typeof row.trick_type === "string" ? row.trick_type : "",
    explanation: typeof row.explanation === "string" ? row.explanation : "",
    rule_name: typeof row.rule_name === "string" ? row.rule_name : null,
    key_takeaway: typeof row.key_takeaway === "string" ? row.key_takeaway : null,
    media: normaliseQuestionMedia(row.media),
  };
}

function parseQuestionArray(data: unknown): SyllogismQuestion[] {
  if (!Array.isArray(data)) return [];
  const out: SyllogismQuestion[] = [];
  for (const item of data) {
    if (item && typeof item === "object") {
      const q = mapRow(item as Record<string, unknown>);
      if (q) out.push(q);
    }
  }
  return out;
}

async function rpcRequest<T>(
  build: () => ReturnType<typeof supabase.rpc>,
  signal?: AbortSignal,
): Promise<T> {
  let request = build();
  if (signal) {
    request = request.abortSignal(signal);
  }

  try {
    const { data, error } = await request;
    if (error) throw error;
    return data as T;
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new Error(toErrorMessage(e));
  }
}

export async function fetchSyllogismMicroBatch(
  count: number,
  signal?: AbortSignal,
): Promise<SyllogismQuestion[]> {
  const data = await rpcRequest<unknown>(
    () => supabase.rpc("get_syllogism_micro_batch", { p_count: count }),
    signal,
  );
  return parseQuestionArray(data);
}

export async function fetchSyllogismFoundationBatch(
  count: number,
  signal?: AbortSignal,
): Promise<SyllogismQuestion[]> {
  const data = await rpcRequest<unknown>(
    () => supabase.rpc("get_syllogism_foundation_batch", { p_count: count }),
    signal,
  );
  return parseQuestionArray(data);
}

export async function fetchSyllogismMacroBlock(
  excludeBlockIds: string[] = [],
  signal?: AbortSignal,
): Promise<SyllogismQuestion[]> {
  const data = await rpcRequest<unknown>(
    () =>
      supabase.rpc("get_syllogism_macro_block", {
        p_exclude_block_ids: excludeBlockIds,
      }),
    signal,
  );
  return parseQuestionArray(data);
}

// ─── Trainer history management ───────────────────────────────────────────────

/** All trainer types that use the question-history system. */
export type TrainerHistoryType =
  | "syllogism_foundation"
  | "syllogism_micro"
  | "syllogism_macro"
  | "sjt_appropriateness"
  | "sjt_importance"
  | "sjt_ranking"
  | "inference"
  | "dm_venn_logic"
  | "dm_data_logic"
  | "dm_argument_judge";

/** @deprecated Use TrainerHistoryType instead */
export type SyllogismTrainerType = TrainerHistoryType;

export interface TrainerState {
  authenticated: boolean;
  current_cycle?: number;
  cycles_completed?: number;
  seen_this_cycle?: number;
  total_seen?: number;
  last_activity_at?: string | null;
}

/**
 * Increment the cycle for the signed-in user + trainer.
 * History rows are never deleted — all-time stats are always preserved.
 * Throws if the user is not authenticated.
 */
export async function resetTrainerHistory(
  trainerType: TrainerHistoryType,
): Promise<void> {
  const { error } = await supabase.rpc("reset_trainer_history", {
    p_trainer_type: trainerType,
  });
  if (error) throw new Error(toErrorMessage(error));
}

/**
 * Returns seen-question stats for the signed-in user + trainer.
 * Returns `{ authenticated: false }` for anon users (never throws).
 */
export async function getTrainerState(
  trainerType: TrainerHistoryType,
): Promise<TrainerState> {
  const { data, error } = await supabase.rpc("get_trainer_state", {
    p_trainer_type: trainerType,
  });
  if (error) throw new Error(toErrorMessage(error));
  return (data ?? { authenticated: false }) as TrainerState;
}
