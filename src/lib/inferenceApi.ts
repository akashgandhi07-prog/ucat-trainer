/**
 * Inference Trainer API — cross-session passage history via Supabase.
 *
 * Authenticated users receive passages they have not seen before (this cycle).
 * Anon users receive any passage other than the one they just completed.
 *
 * The RPC returns a passage_id string (e.g. "pass_07").
 * The caller resolves this to the full Passage object from the local PASSAGES array.
 */

import { supabase } from "./supabase";

export async function fetchNextInferencePassageId(
  currentPassageId?: string | null,
  signal?: AbortSignal,
): Promise<string | null> {
  let request = supabase.rpc("get_inference_passage", {
    p_current_id: currentPassageId ?? null,
  });

  if (signal) {
    request = request.abortSignal(signal);
  }

  try {
    const { data, error } = await request;
    if (error) throw error;
    return typeof data === "string" ? data : null;
  } catch (e) {
    // Surface abort errors directly so callers can handle them
    if (isInferenceAbortError(e)) throw e;
    // Swallow other errors gracefully — caller can fall back to local picker
    return null;
  }
}

function isInferenceAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: unknown }).message)
        : "";
  return msg.includes("AbortError") || msg.includes("signal is aborted");
}
