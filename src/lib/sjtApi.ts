import { supabase } from "./supabase";
import type { SJTQuestion, SJTQuestionType } from "../types/sjt";

const FETCH_TIMEOUT_MS = 10_000;

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
  signal?: AbortSignal,
): Promise<SJTQuestion | null> {
  let request = supabase.rpc("get_random_sjt_question", {
    p_type: type,
    p_exclude_ids: excludeIds,
  });

  if (signal) {
    request = request.abortSignal(signal);
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Request timed out. Please check your connection and try again.")),
      FETCH_TIMEOUT_MS,
    );
  });

  try {
    const { data, error } = await Promise.race([request, timeoutPromise]);
    if (error) throw error;
    return parseSjtQuestion(data);
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new Error(toErrorMessage(e));
  } finally {
    clearTimeout(timeoutId);
  }
}
