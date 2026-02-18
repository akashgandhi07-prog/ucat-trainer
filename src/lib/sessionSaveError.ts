/**
 * Returns a short, user-friendly message for session save failures.
 * Maps common Supabase/network error codes to clearer copy.
 */
export function getSessionSaveErrorMessage(err: unknown): string {
  if (err == null) return "Failed to save. Please try again.";
  const obj = err as { message?: string; code?: string };
  const msg = (obj?.message ?? "").toLowerCase();
  const code = obj?.code ?? "";

  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }
  if (code === "PGRST301" || msg.includes("row-level security") || msg.includes("policy")) {
    return "You don't have permission to save. Try signing in again.";
  }
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "Request timed out. Please try again.";
  }

  return "Failed to save. Please try again.";
}
