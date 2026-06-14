/**
 * Detect "your session is no longer valid" errors and surface them as a clean
 * re-login prompt instead of a generic "couldn't save" toast.
 *
 * When a JWT expires mid-quiz, Supabase rejects writes with 401 or a PostgREST
 * RLS error (PGRST301 / 42501). Save paths call notifyIfAuthError(error); the
 * AuthProvider listens for the dispatched event and runs its stale-session
 * handler (local sign-out + "session expired, please sign in again"). Debounced
 * so a burst of failed writes only triggers one prompt.
 */

export const STALE_SESSION_EVENT = "auth:stale-session";

export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string; message?: string };
  if (e.status === 401 || e.status === 403) return true;
  if (e.code === "PGRST301" || e.code === "42501") return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("jwt expired") ||
    msg.includes("jwt") && msg.includes("invalid") ||
    msg.includes("not authenticated") ||
    msg.includes("row-level security")
  );
}

let lastNotified = 0;

/** If `error` looks like an expired/invalid session, dispatch the stale-session event (once per 5s). */
export function notifyIfAuthError(error: unknown): boolean {
  if (typeof window === "undefined" || !isAuthError(error)) return false;
  // Date.now via performance.now to stay deterministic-safe is unnecessary here.
  const now = Date.now();
  if (now - lastNotified < 5000) return true;
  lastNotified = now;
  window.dispatchEvent(new CustomEvent(STALE_SESSION_EVENT));
  return true;
}
