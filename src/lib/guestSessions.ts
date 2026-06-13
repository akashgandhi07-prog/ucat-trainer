import type { SessionInsertPayload } from "../types/session";

export const GUEST_SESSIONS_KEY = "guest_sessions";

export type GuestSessionPayload = Omit<SessionInsertPayload, "user_id">;

export function getGuestSessions(): GuestSessionPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is GuestSessionPayload =>
        item &&
        typeof item === "object" &&
        typeof item.training_type === "string" &&
        typeof item.correct === "number" &&
        typeof item.total === "number" &&
        ["speed_reading", "rapid_recall", "keyword_scanning", "inference_trainer", "mental_maths", "calculator", "unit_conversions", "not_except"].includes(item.training_type)
    );
  } catch {
    return [];
  }
}

const MAX_GUEST_SESSIONS = 200;

export function appendGuestSession(payload: GuestSessionPayload): void {
  const sessions = getGuestSessions();
  // A drill that checkpoints (or saves from several paths) replaces its own
  // snapshot instead of stacking duplicates - mirrors the cloud upsert.
  const existing = payload.client_session_id
    ? sessions.findIndex((s) => s.client_session_id === payload.client_session_id)
    : -1;
  if (existing >= 0) sessions[existing] = payload;
  else sessions.push(payload);
  // Keep only the most recent sessions to prevent localStorage overflow
  const capped = sessions.length > MAX_GUEST_SESSIONS
    ? sessions.slice(sessions.length - MAX_GUEST_SESSIONS)
    : sessions;
  localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(capped));
}

/**
 * Ensure every stored guest session has a client_session_id and persist the result.
 * Run before merging to the cloud so a retried merge upserts instead of duplicating.
 */
export function ensureGuestSessionIds(): GuestSessionPayload[] {
  const sessions = getGuestSessions();
  let changed = false;
  for (const s of sessions) {
    if (!s.client_session_id) {
      s.client_session_id = crypto.randomUUID();
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
    } catch {
      /* persisting ids is best-effort */
    }
  }
  return sessions;
}

export function clearGuestSessions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_SESSIONS_KEY);
}
