/**
 * Persist DM skills trainer sessions to Supabase or guest localStorage.
 */

import { supabase } from "./supabase";
import { withRetry } from "./retry";
import { supabaseLog } from "./logger";
import { trackEvent } from "./analytics";
import type { DmTrainerSessionSummary, DmTrainerType } from "../types/dmTrainers";

export const GUEST_DM_TRAINER_SESSIONS_KEY = "guest_dm_trainer_sessions_v1";
const MAX_GUEST = 80;

export type DmTrainerSessionPayload = {
  trainer_type: DmTrainerType;
  score: number;
  total_questions: number;
  elapsed_seconds: number;
  retry_mode: boolean;
  answers: DmTrainerSessionSummary["answers"];
};

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isGuestPayload(item: unknown): item is DmTrainerSessionPayload {
  if (!item || typeof item !== "object") return false;
  const v = item as Partial<DmTrainerSessionPayload>;
  return (
    typeof v.trainer_type === "string" &&
    typeof v.score === "number" &&
    typeof v.total_questions === "number" &&
    typeof v.elapsed_seconds === "number" &&
    typeof v.retry_mode === "boolean" &&
    Array.isArray(v.answers)
  );
}

export function summaryToPayload(
  summary: DmTrainerSessionSummary,
  retryMode: boolean,
): DmTrainerSessionPayload {
  return {
    trainer_type: summary.trainerType,
    score: summary.correct,
    total_questions: summary.total,
    elapsed_seconds: summary.elapsedSeconds,
    retry_mode: retryMode,
    answers: summary.answers,
  };
}

export function getGuestDmTrainerSessions(): DmTrainerSessionPayload[] {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_DM_TRAINER_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGuestPayload);
  } catch {
    return [];
  }
}

export function appendGuestDmTrainerSession(payload: DmTrainerSessionPayload): void {
  if (!storageAvailable()) return;
  const sessions = getGuestDmTrainerSessions();
  sessions.push(payload);
  const capped =
    sessions.length > MAX_GUEST ? sessions.slice(sessions.length - MAX_GUEST) : sessions;
  localStorage.setItem(GUEST_DM_TRAINER_SESSIONS_KEY, JSON.stringify(capped));
}

export function clearGuestDmTrainerSessions(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(GUEST_DM_TRAINER_SESSIONS_KEY);
}

export async function saveDmTrainerSessionToCloud(
  userId: string,
  payload: DmTrainerSessionPayload,
): Promise<{ saved: boolean; error?: string }> {
  if (payload.total_questions <= 0) return { saved: false };

  try {
    await withRetry(async () => {
      const { error } = await supabase.from("dm_trainer_sessions").insert({
        user_id: userId,
        ...payload,
      });
      if (error) throw error;
    });
    supabaseLog.info("dm_trainer_session_saved", {
      trainer_type: payload.trainer_type,
      score: payload.score,
      total: payload.total_questions,
    });
    return { saved: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    supabaseLog.error("dm_trainer_session_save_failed", { message });
    return { saved: false, error: message };
  }
}

export async function persistDmTrainerSession(
  userId: string | null,
  summary: DmTrainerSessionSummary,
  retryMode: boolean,
): Promise<void> {
  const payload = summaryToPayload(summary, retryMode);
  if (payload.total_questions <= 0) return;

  if (userId) {
    await saveDmTrainerSessionToCloud(userId, payload);
  } else {
    appendGuestDmTrainerSession(payload);
  }

  trackEvent("trainer_completed", {
    training_type: `dm_${summary.trainerType.replace(/-/g, "_")}`,
    correct: summary.correct,
    total: summary.total,
    time_seconds: summary.elapsedSeconds,
    retry_mode: retryMode,
  });
}

export async function mergeGuestDmTrainerOnSignIn(userId: string): Promise<boolean> {
  const guest = getGuestDmTrainerSessions();
  if (guest.length === 0) return true;

  const rows = guest.map((g) => ({ user_id: userId, ...g }));
  const { error } = await supabase.from("dm_trainer_sessions").insert(rows);
  if (!error) {
    clearGuestDmTrainerSessions();
    return true;
  }
  supabaseLog.error("guest_dm_trainer_merge_failed", { message: error.message });
  return false;
}

/** Legacy localStorage-only key from beta; merge once on sign-in. */
export async function migrateLegacyDmTrainerSessions(userId: string): Promise<void> {
  if (!storageAvailable()) return;
  const legacyKey = "ucat_dm_trainer_sessions_v1";
  const raw = localStorage.getItem(legacyKey);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw) as DmTrainerSessionSummary[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(legacyKey);
      return;
    }
    const rows = parsed
      .filter((s) => s && typeof s.trainerType === "string" && s.total > 0)
      .map((s) => ({
        user_id: userId,
        trainer_type: s.trainerType,
        score: s.correct,
        total_questions: s.total,
        elapsed_seconds: s.elapsedSeconds ?? 0,
        retry_mode: false,
        answers: s.answers ?? [],
        created_at: s.completedAt ?? new Date().toISOString(),
      }));
    if (rows.length > 0) {
      await supabase.from("dm_trainer_sessions").insert(rows);
    }
    localStorage.removeItem(legacyKey);
  } catch {
    localStorage.removeItem(legacyKey);
  }
}
