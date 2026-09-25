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
import { isAuthError, notifyIfAuthError } from "./authError";

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

/**
 * Postgres check_violation. On `sessions` this means sessions_training_type_check
 * does not yet allow the training_type (a new trainer shipped before its migration
 * was applied). Retrying cannot help, and students must not see an error for it.
 */
const CHECK_VIOLATION = "23514";

export function isCheckViolation(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === CHECK_VIOLATION;
}

class UnsupportedTrainingTypeError extends Error {
  // AbortError stops withRetry immediately.
  name = "AbortError";
  unsupportedTrainingType = true;
}

const loggedUnsupportedTypes = new Set<string>();

function noteUnsupportedTrainingType(trainingType: string) {
  if (loggedUnsupportedTypes.has(trainingType)) return;
  loggedUnsupportedTypes.add(trainingType);
  supabaseLog.warn("trainer_session_type_not_allowed_yet", {
    trainingType,
    hint: "Apply supabase/migrations/20260925160000_skill_trainer_session_types.sql; runs are kept on this device until then.",
  });
}

export type PendingTrainerSession = TrainerSessionUpsert & { client_session_id: string };

const PENDING_PREFIX = "pending_trainer_sessions_v1:";
const MAX_PENDING = 200;

function readPending(userId: string): PendingTrainerSession[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(`${PENDING_PREFIX}${userId}`) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is PendingTrainerSession => (
      Boolean(row)
      && typeof row === "object"
      && typeof (row as PendingTrainerSession).training_type === "string"
      && typeof (row as PendingTrainerSession).client_session_id === "string"
      && typeof (row as PendingTrainerSession).correct === "number"
      && typeof (row as PendingTrainerSession).total === "number"
    ));
  } catch {
    return [];
  }
}

function writePending(userId: string, rows: PendingTrainerSession[]) {
  if (typeof window === "undefined") return;
  try {
    const key = `${PENDING_PREFIX}${userId}`;
    if (rows.length) localStorage.setItem(key, JSON.stringify(rows.slice(-MAX_PENDING)));
    else localStorage.removeItem(key);
  } catch {
    /* best effort: a full or blocked store only loses the offline copy */
  }
}

/**
 * Keep signed-in runs the database rejected with a check violation on this device, so
 * they upload once the constraint allows their training_type. Latest snapshot per
 * client_session_id wins, mirroring the cloud upsert.
 */
export function queuePendingTrainerSessions(userId: string, rows: PendingTrainerSession[]) {
  if (!rows.length) return;
  const byId = new Map(readPending(userId).map((row) => [row.client_session_id, row]));
  for (const row of rows) {
    byId.set(row.client_session_id, row);
    noteUnsupportedTrainingType(row.training_type);
  }
  writePending(userId, [...byId.values()]);
}

/** Runs saved on this device for a signed-in user that are waiting for the migration. */
export function getPendingTrainerSessions(userId: string): PendingTrainerSession[] {
  return readPending(userId);
}

/**
 * Upload any runs held back by a check violation. Safe to call on every sign-in and
 * page load: the upsert is idempotent and the rows stay queued while it still fails.
 */
export async function replayPendingTrainerSessions(userId: string): Promise<void> {
  const pending = readPending(userId);
  if (!pending.length) return;
  const { error } = await supabase.from("sessions").upsert(
    pending.map((row) => ({ ...row, user_id: userId })),
    { onConflict: "user_id,client_session_id" },
  );
  if (!error) {
    // Only drop what was sent; a snapshot queued during the request stays.
    const sent = new Set(pending.map((row) => JSON.stringify(row)));
    writePending(userId, readPending(userId).filter((row) => !sent.has(JSON.stringify(row))));
    supabaseLog.info("pending_trainer_sessions_uploaded", { count: pending.length });
    return;
  }
  if (isCheckViolation(error)) {
    pending.forEach((row) => noteUnsupportedTrainingType(row.training_type));
    return;
  }
  supabaseLog.warn("pending_trainer_sessions_upload_failed", { code: error.code, message: error.message });
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
    if (error) {
      if (isCheckViolation(error)) {
        throw new UnsupportedTrainingTypeError(error.message);
      }
      // An expired session won't be fixed by retrying, and the user should be told
      // to sign in again rather than shown a generic "couldn't save".
      if (isAuthError(error)) {
        notifyIfAuthError(error);
        throw Object.assign(new Error(error.message), { name: "AbortError" });
      }
      throw error;
    }
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
    if (err instanceof UnsupportedTrainingTypeError) {
      // The run is kept on this device and uploaded once the constraint allows it,
      // so from the student's point of view it was saved.
      queuePendingTrainerSessions(userId, [{ ...payload, client_session_id: clientSessionId }]);
      return true;
    }
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
