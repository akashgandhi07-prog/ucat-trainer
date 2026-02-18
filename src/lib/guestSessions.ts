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
        ["speed_reading", "rapid_recall", "keyword_scanning", "inference_trainer"].includes(item.training_type)
    );
  } catch {
    return [];
  }
}

const MAX_GUEST_SESSIONS = 200;

export function appendGuestSession(payload: GuestSessionPayload): void {
  const sessions = getGuestSessions();
  sessions.push(payload);
  // Keep only the most recent sessions to prevent localStorage overflow
  const capped = sessions.length > MAX_GUEST_SESSIONS
    ? sessions.slice(sessions.length - MAX_GUEST_SESSIONS)
    : sessions;
  localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(capped));
}

export function clearGuestSessions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_SESSIONS_KEY);
}
