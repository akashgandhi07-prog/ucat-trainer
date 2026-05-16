import { supabase } from "./supabase";
import type { SyllogismQuestion, LogicGroup } from "../types/syllogisms";

const FETCH_TIMEOUT_MS = 15_000;

function toErrorMessage(e: unknown): string {
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

async function rpcWithTimeout<T>(rpcPromise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error("Request timed out. Check your connection and try again."),
        ),
      FETCH_TIMEOUT_MS,
    );
  });

  try {
    const { data, error } = await Promise.race([
      Promise.resolve(rpcPromise).then((r) => {
        clearTimeout(timeoutId);
        return r;
      }),
      timeoutPromise,
    ]);
    if (error) throw error;
    return data as T;
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}

export async function fetchSyllogismMicroBatch(count: number): Promise<SyllogismQuestion[]> {
  const data = await rpcWithTimeout<unknown>(
    supabase.rpc("get_syllogism_micro_batch", { p_count: count }),
  );
  return parseQuestionArray(data);
}

export async function fetchSyllogismMacroBlock(
  excludeBlockIds: string[] = [],
): Promise<SyllogismQuestion[]> {
  const data = await rpcWithTimeout<unknown>(
    supabase.rpc("get_syllogism_macro_block", {
      p_exclude_block_ids: excludeBlockIds,
    }),
  );
  return parseQuestionArray(data);
}
