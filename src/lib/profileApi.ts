import { supabase } from "./supabase";
import { authLog, supabaseLog } from "./logger";

export type Stream =
  | "Medicine"
  | "Dentistry"
  | "Veterinary Medicine"
  | "Other"
  | "Undecided";

export type Profile = {
  id: string;
  full_name: string | null;
  stream: Stream | null;
  updated_at: string;
  role?: string | null;
  entry_year?: string | null;
  email_marketing_opt_in?: boolean;
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
 * Upsert profile (full_name, stream) for the given user. Creates a minimal row if neither name nor stream
 * are provided (e.g. login-only flow). No-op if profiles table doesn't exist or RLS fails.
 */
export async function upsertProfile(
  userId: string,
  fullName: string | null,
  stream?: string | null,
  extra?: {
    firstName?: string | null;
    lastName?: string | null;
    entryYear?: string | null;
    emailMarketingOptIn?: boolean | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const name = fullName?.trim() || null;
  const validStream: Stream | null =
    stream &&
    ["Medicine", "Dentistry", "Veterinary Medicine", "Other", "Undecided"].includes(
      stream
    )
      ? (stream as Stream)
      : null;
  try {
    const payload: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    if (name) payload.full_name = name;
    if (validStream != null) payload.stream = validStream;
    if (extra) {
      if (extra.firstName !== undefined) {
        payload.first_name = extra.firstName?.trim() || null;
      }
      if (extra.lastName !== undefined) {
        payload.last_name = extra.lastName?.trim() || null;
      }
      if (extra.entryYear !== undefined) {
        payload.entry_year = extra.entryYear || null;
      }
      if (extra.emailMarketingOptIn !== undefined) {
        payload.email_marketing_opt_in = !!extra.emailMarketingOptIn;
        if (extra.emailMarketingOptIn) {
          payload.email_marketing_opt_in_at = new Date().toISOString();
        }
      }
    }
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
