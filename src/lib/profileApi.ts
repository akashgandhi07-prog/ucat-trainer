import { supabase } from "./supabase";
import { authLog, supabaseLog } from "./logger";

export type Stream = "Medicine" | "Dentistry" | "Undecided";

export type Profile = {
  id: string;
  full_name: string | null;
  stream: Stream | null;
  updated_at: string;
  role?: string | null;
};

/**
 * Fetch profile for the given user id. Returns null if no row or on error.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, stream, updated_at, role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      supabaseLog.error("getProfile failed", { userId, error: error.message });
      return null;
    }
    if (data) authLog.info("Profile loaded", { userId, full_name: (data as Profile).full_name });
    return (data as Profile) ?? null;
  } catch (e) {
    supabaseLog.error("getProfile threw", e);
    return null;
  }
}

/**
 * Upsert profile (full_name, stream) for the given user. No-op if profiles table doesn't exist or RLS fails.
 */
export async function upsertProfile(
  userId: string,
  fullName: string | null,
  stream?: Stream | null
): Promise<{ ok: boolean; error?: string }> {
  const name = fullName?.trim() || null;
  const validStream: Stream | null =
    stream && ["Medicine", "Dentistry", "Undecided"].includes(stream) ? stream : null;
  if (!name && validStream == null) {
    authLog.info("upsertProfile skipped (no name or stream)", { userId });
    return { ok: true };
  }
  try {
    const payload: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    if (name) payload.full_name = name;
    if (validStream != null) payload.stream = validStream;
    const { error } = await supabase.from("profiles").upsert(
      payload as { id: string; full_name?: string; stream?: string; updated_at: string },
      { onConflict: "id" }
    );

    if (error) {
      supabaseLog.warn("upsertProfile failed (table may not exist)", {
        userId,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
    authLog.info("Profile upserted", { userId, full_name: name, stream: validStream });
    return { ok: true };
  } catch (e) {
    supabaseLog.error("upsertProfile threw", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
