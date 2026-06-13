/**
 * Deduplicated trainer-session logging.
 *
 * Trainers historically saved from several code paths (auto-save on results, manual
 * save buttons, pagehide handlers), which produced near-duplicate rows for ~25% of
 * sessions. Every drill now carries one client-generated uuid; cloud writes upsert on
 * (user_id, client_session_id) so retries and duplicate paths update a single row,
 * and checkpoint-style trainers overwrite their own snapshot instead of stacking rows.
 */

import { supabase } from "./supabase";
import { withRetry } from "./retry";
import { supabaseLog } from "./logger";

export type TrainerSessionUpsert = {
  training_type: string;
  difficulty?: string | null;
  wpm?: number | null;
  kps?: number | null;
  avg_ms?: number | null;
  correct: number;
  total: number;
  passage_id?: string | null;
  wpm_rating?: string | null;
  time_seconds?: number | null;
};

export function newClientSessionId(): string {
  return crypto.randomUUID();
}

// One in-flight write per drill; if another snapshot arrives while a write is
// running, only the latest queued snapshot is sent afterwards.
const inFlight = new Map<string, Promise<void>>();
const queued = new Map<string, TrainerSessionUpsert>();

async function writeOnce(
  userId: string,
  clientSessionId: string,
  payload: TrainerSessionUpsert,
): Promise<void> {
  await withRetry(async () => {
    const { error } = await supabase.from("sessions").upsert(
      { ...payload, user_id: userId, client_session_id: clientSessionId },
      { onConflict: "user_id,client_session_id" },
    );
    if (error) throw error;
  });
}

/**
 * Upsert the latest snapshot of a drill for a signed-in user. Safe to call from
 * multiple paths with the same clientSessionId - the row converges, never duplicates.
 * Returns false when the write ultimately failed (caller may inform the user).
 */
export async function upsertTrainerSession(
  userId: string,
  clientSessionId: string,
  payload: TrainerSessionUpsert,
): Promise<boolean> {
  const key = `${userId}:${clientSessionId}`;
  if (inFlight.has(key)) {
    queued.set(key, payload);
    try {
      await inFlight.get(key);
    } catch {
      /* previous write's failure is reported to its own caller */
    }
    if (queued.get(key) !== payload) return true; // superseded by a newer snapshot
    queued.delete(key);
  }

  const run = writeOnce(userId, clientSessionId, payload);
  inFlight.set(key, run);
  try {
    await run;
    return true;
  } catch (err) {
    supabaseLog.error("trainer_session_upsert_failed", {
      trainingType: payload.training_type,
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  } finally {
    if (inFlight.get(key) === run) inFlight.delete(key);
    const next = queued.get(key);
    if (next) {
      queued.delete(key);
      void upsertTrainerSession(userId, clientSessionId, next);
    }
  }
}
