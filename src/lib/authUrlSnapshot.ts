/**
 * Snapshot of the auth parameters Supabase puts in the URL fragment on an email link.
 *
 * Two races make both the URL and the auth event unreliable by the time React renders:
 * supabase-js strips the fragment while it initialises, and it emits PASSWORD_RECOVERY
 * from a `setTimeout` that can fire before AuthProvider has subscribed. This module is
 * imported by `lib/supabase.ts` *before* `createClient()` runs, so it reads the fragment
 * first and holds the result for the app to consume.
 */

export type AuthUrlSnapshot = {
  /** The link was a password-recovery link (`#type=recovery`). */
  isRecovery: boolean;
  /** Why the link failed, when Supabase rejected it (expired, already used). */
  errorDescription: string | null;
};

const EMPTY: AuthUrlSnapshot = { isRecovery: false, errorDescription: null };

function readSnapshot(): AuthUrlSnapshot {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return EMPTY;
  const params = new URLSearchParams(raw);
  return {
    isRecovery: params.get("type") === "recovery",
    errorDescription: params.get("error_description"),
  };
}

const snapshot = readSnapshot();

export function getAuthUrlSnapshot(): AuthUrlSnapshot {
  return snapshot;
}
