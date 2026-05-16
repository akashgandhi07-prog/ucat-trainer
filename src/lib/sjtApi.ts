import { supabase } from "./supabase";
import type { SJTQuestion, SJTQuestionType } from "../types/sjt";

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
  return "Failed to load question. Please try again or check your connection.";
}

function parseSjtQuestion(data: unknown): SJTQuestion | null {
  if (data == null) return null;
  if (typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.type !== "string" || typeof o.stem !== "string") {
    return null;
  }
  return data as SJTQuestion;
}

export async function fetchRandomSJTQuestion(
  type: SJTQuestionType,
  excludeIds: string[] = [],
): Promise<SJTQuestion | null> {
  const rpcPromise = supabase.rpc("get_random_sjt_question", {
    p_type: type,
    p_exclude_ids: excludeIds,
  });

  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Request timed out. Check your connection and try again.")),
      FETCH_TIMEOUT_MS,
    );
  });

  try {
    const { data, error } = await Promise.race([
      rpcPromise.then((r) => {
        clearTimeout(timeoutId);
        return r;
      }),
      timeoutPromise,
    ]);

    if (error) throw error;
    return parseSjtQuestion(data);
  } catch (e) {
    throw new Error(toErrorMessage(e));
  }
}
