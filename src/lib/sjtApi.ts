import { supabase } from "./supabase";
import type { SJTQuestion, SJTQuestionType } from "../types/sjt";
import { normaliseQuestionMedia } from "../types/questionMedia";
import { loadQuestionOverrides, applyOverride } from "./questionOverrides";

export type SJTPracticeFilters = { domain?: string; difficulty?: string; questionId?: string };

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
  return {
    ...(data as SJTQuestion),
    media: normaliseQuestionMedia(o.media),
  } as SJTQuestion;
}

/** Thrown when a delayed review cannot be served because the targeted RPC is not deployed yet. */
export class SJTReviewUnavailableError extends Error {
  constructor() {
    super("Delayed retries are temporarily unavailable. Your review is still saved, so please try again later.");
    this.name = "SJTReviewUnavailableError";
  }
}

/** PostgREST / Postgres signals that an RPC does not exist (not yet migrated). */
export function isMissingRpcError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const { code, message } = e as { code?: unknown; message?: unknown };
  if (code === "PGRST202" || code === "42883") return true;
  return typeof message === "string" && message.includes("Could not find the function");
}

// Remembered for the page lifetime so a missing RPC is only probed once.
let practiceRpcMissing = false;
const FALLBACK_FILTER_ATTEMPTS = 5;

async function callSjtRpc(
  name: "get_random_sjt_question" | "get_sjt_practice_question",
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<SJTQuestion | null> {
  let request = supabase.rpc(name, args);
  if (signal) request = request.abortSignal(signal);

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
  } finally {
    clearTimeout(timeoutId);
  }
}

// trainer_questions stores easy/medium/hard; older content used the display names.
const DIFFICULTY_ALIASES: Record<string, string> = { foundation: "easy", standard: "medium", challenging: "hard" };
const normaliseDifficulty = (value: string) => DIFFICULTY_ALIASES[value] ?? value;

function matchesFilters(q: SJTQuestion, filters: SJTPracticeFilters): boolean {
  if (filters.domain && q.domain !== filters.domain) return false;
  if (filters.difficulty && normaliseDifficulty(String(q.difficulty)) !== normaliseDifficulty(filters.difficulty)) return false;
  return true;
}

/**
 * Fallback for filtered practice while get_sjt_practice_question is not deployed:
 * re-roll the unfiltered RPC (which records history for signed-in users) a few
 * times and keep the first match. If nothing matches, serve the last scenario
 * rather than an error, because it has already been marked as seen.
 */
async function fetchFilteredViaRandom(
  type: SJTQuestionType,
  excludeIds: string[],
  signal: AbortSignal | undefined,
  filters: SJTPracticeFilters,
): Promise<SJTQuestion | null> {
  const excluded = [...excludeIds];
  let last: SJTQuestion | null = null;
  for (let attempt = 0; attempt < FALLBACK_FILTER_ATTEMPTS; attempt += 1) {
    const q = await callSjtRpc("get_random_sjt_question", { p_type: type, p_exclude_ids: excluded }, signal);
    if (!q) break;
    last = q;
    if (matchesFilters(q, filters)) return q;
    excluded.push(q.id);
  }
  return last;
}

export async function fetchRandomSJTQuestion(
  type: SJTQuestionType,
  excludeIds: string[] = [],
  signal?: AbortSignal,
  _depth = 0,
  filters: SJTPracticeFilters = {},
): Promise<SJTQuestion | null> {
  const targeted = Boolean(filters.domain || filters.difficulty || filters.questionId);

  let parsed: SJTQuestion | null;
  try {
    if (!targeted) {
      parsed = await callSjtRpc("get_random_sjt_question", { p_type: type, p_exclude_ids: excludeIds }, signal);
    } else {
      if (practiceRpcMissing) {
        if (filters.questionId) throw new SJTReviewUnavailableError();
        parsed = await fetchFilteredViaRandom(type, excludeIds, signal, filters);
      } else {
        try {
          parsed = await callSjtRpc("get_sjt_practice_question", {
            p_type: type, p_domain: filters.domain || null, p_difficulty: filters.difficulty || null,
            p_question_id: filters.questionId || null, p_exclude_ids: excludeIds,
          }, signal);
        } catch (e) {
          if (!isMissingRpcError(e)) throw e;
          practiceRpcMissing = true;
          // A delayed review needs one specific scenario; a random one would corrupt the queue.
          if (filters.questionId) throw new SJTReviewUnavailableError();
          parsed = await fetchFilteredViaRandom(type, excludeIds, signal, filters);
        }
      }
    }
  } catch (e) {
    if (isAbortError(e)) throw e;
    if (e instanceof SJTReviewUnavailableError) throw e;
    throw new Error(toErrorMessage(e));
  }

  if (!parsed) return null;

  // Apply admin overrides: drop hidden questions (re-rolling, bounded) and
  // merge any content edits. Fail-open via loadQuestionOverrides().
  const overrides = await loadQuestionOverrides();
  const merged = applyOverride(`sjt:${parsed.id}`, parsed, overrides);
  if (merged == null) {
    if (filters.questionId || _depth >= 8) return null;
    return fetchRandomSJTQuestion(type, [...excludeIds, parsed.id], signal, _depth + 1, filters);
  }
  return merged;
}
