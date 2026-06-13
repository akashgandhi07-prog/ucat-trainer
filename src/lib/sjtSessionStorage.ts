/**
 * Persist SJT trainer attempts to Supabase (sjt_sessions) or guest localStorage.
 */

import { supabase } from "./supabase";
import { withRetry } from "./retry";
import { supabaseLog } from "./logger";
import { trackEvent } from "./analytics";
import type { SJTSessionsPayload, SJTSessionsRow } from "../types/sjt";

export const GUEST_SJT_SESSIONS_KEY = "guest_sjt_sessions";
const MIGRATED_LOCAL_SJT_KEY = "ucat_sjt_local_migrated_v1";
const MAX_GUEST_SJT_SESSIONS = 200;

export type GuestSJTSessionPayload = SJTSessionsPayload;

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isGuestPayload(item: unknown): item is GuestSJTSessionPayload {
  if (!item || typeof item !== "object") return false;
  const v = item as Partial<GuestSJTSessionPayload>;
  return (
    typeof v.question_id === "string" &&
    typeof v.question_type === "string" &&
    typeof v.domain === "string" &&
    typeof v.score === "number" &&
    typeof v.max_score === "number" &&
    typeof v.items_attempted === "number" &&
    typeof v.items_total === "number" &&
    typeof v.completed === "boolean"
  );
}

export function getGuestSJTSessions(): GuestSJTSessionPayload[] {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_SJT_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGuestPayload);
  } catch {
    return [];
  }
}

export function appendGuestSJTSession(payload: GuestSJTSessionPayload): void {
  if (!storageAvailable()) return;
  const sessions = getGuestSJTSessions();
  sessions.push(payload);
  const capped =
    sessions.length > MAX_GUEST_SJT_SESSIONS
      ? sessions.slice(sessions.length - MAX_GUEST_SJT_SESSIONS)
      : sessions;
  localStorage.setItem(GUEST_SJT_SESSIONS_KEY, JSON.stringify(capped));
}

export function clearGuestSJTSessions(): void {
  if (!storageAvailable()) return;
  localStorage.removeItem(GUEST_SJT_SESSIONS_KEY);
}

export async function saveSJTSession(
  userId: string,
  payload: GuestSJTSessionPayload,
): Promise<{ saved: boolean; error?: string }> {
  if (payload.max_score <= 0) return { saved: false };

  const row = {
    user_id: userId,
    ...payload,
  };

  try {
    await withRetry(async () => {
      const { error } = await supabase.from("sjt_sessions").insert(row);
      if (error) throw error;
    });
    trackEvent("trainer_completed", {
      training_type: `sjt_${payload.question_type}`,
      completed: payload.completed,
    });
    supabaseLog.info("sjt_session_saved", {
      question_type: payload.question_type,
      completed: payload.completed,
      score: payload.score,
      max_score: payload.max_score,
    });
    return { saved: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    supabaseLog.error("sjt_session_save_failed", { message });
    return { saved: false, error: message };
  }
}

export async function persistSJTSession(
  userId: string | null,
  payload: GuestSJTSessionPayload,
): Promise<void> {
  if (payload.max_score <= 0) return;
  if (userId) {
    await saveSJTSession(userId, payload);
  } else {
    appendGuestSJTSession(payload);
  }
}

export async function mergeGuestSJTOnSignIn(userId: string): Promise<boolean> {
  const guest = getGuestSJTSessions();
  if (guest.length === 0) return true;

  const rows = guest.map((g) => ({ user_id: userId, ...g }));
  const { error } = await supabase.from("sjt_sessions").insert(rows);
  if (!error) {
    clearGuestSJTSessions();
    return true;
  }
  supabaseLog.error("guest_sjt_merge_failed", { message: error.message, code: error.code });
  return false;
}

/** Upload legacy ucat_sjt_analytics_v1 rows once per browser after sign-in. */
export async function migrateLocalSJTAttemptsToCloud(userId: string): Promise<void> {
  if (!storageAvailable()) return;
  if (localStorage.getItem(MIGRATED_LOCAL_SJT_KEY) === userId) return;

  const raw = localStorage.getItem("ucat_sjt_analytics_v1");
  if (!raw) {
    localStorage.setItem(MIGRATED_LOCAL_SJT_KEY, userId);
    return;
  }

  let attempts: Array<{
    questionId: string;
    domain: string;
    type: string;
    score: number;
    maxScore: number;
    timestamp: number;
  }> = [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      attempts = parsed.filter(
        (a): a is (typeof attempts)[number] =>
          !!a &&
          typeof a === "object" &&
          typeof (a as { questionId?: string }).questionId === "string" &&
          typeof (a as { score?: number }).score === "number" &&
          typeof (a as { maxScore?: number }).maxScore === "number" &&
          (a as { maxScore: number }).maxScore > 0,
      ) as typeof attempts;
    }
  } catch {
    localStorage.setItem(MIGRATED_LOCAL_SJT_KEY, userId);
    return;
  }

  if (attempts.length === 0) {
    localStorage.setItem(MIGRATED_LOCAL_SJT_KEY, userId);
    return;
  }

  const rows = attempts.map((a) => {
    // Legacy attempts never stored item counts, so estimate from the scoring scheme:
    // rating questions award 1 mark per item (items ≈ max score); a ranking question
    // is one scenario worth 2 marks, not two items.
    const estimatedItems =
      a.type === "ranking" ? 1 : Math.max(1, Math.round(a.maxScore));
    return {
      user_id: userId,
      question_id: a.questionId,
      question_type: a.type,
      domain: a.domain,
      score: a.score,
      max_score: a.maxScore,
      items_attempted: estimatedItems,
      items_total: estimatedItems,
      completed: true,
      created_at: new Date(a.timestamp).toISOString(),
    };
  });

  const { error } = await supabase.from("sjt_sessions").insert(rows);
  if (!error) {
    localStorage.setItem(MIGRATED_LOCAL_SJT_KEY, userId);
  } else {
    supabaseLog.error("local_sjt_migration_failed", { message: error.message });
  }
}

export function formatSJTSessionScore(row: Pick<SJTSessionsRow, "score" | "max_score" | "completed">): string {
  const pct = row.max_score > 0 ? Math.round((row.score / row.max_score) * 100) : 0;
  if (!row.completed) {
    return `${pct}% (partial)`;
  }
  return `${pct}%`;
}
