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
  /** UCAT exam date (April–September only). ISO date string YYYY-MM-DD. */
  ucat_exam_date?: string | null;
};

/**
 * Fetch profile for the given user id. Returns null if no row or on error.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, stream, updated_at, role, entry_year, email_marketing_opt_in, ucat_exam_date")
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

const FULL_NAME_MAX = 500;
const FIRST_NAME_MAX = 200;
const LAST_NAME_MAX = 200;
const ENTRY_YEAR_MAX = 20;

function cap(s: string | null | undefined, max: number): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

/**
 * Upsert profile (full_name, stream) for the given user. Creates a minimal row if neither name nor stream
 * are provided (e.g. login-only flow). No-op if profiles table doesn't exist or RLS fails.
 * Name and entry_year are capped to match DB constraints.
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
    /** UCAT exam date. ISO date YYYY-MM-DD; must be in April (4) through September (9). */
    ucatExamDate?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const name = cap(fullName, FULL_NAME_MAX);
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
        payload.first_name = cap(extra.firstName, FIRST_NAME_MAX);
      }
      if (extra.lastName !== undefined) {
        payload.last_name = cap(extra.lastName, LAST_NAME_MAX);
      }
      if (extra.entryYear !== undefined) {
        payload.entry_year = cap(extra.entryYear, ENTRY_YEAR_MAX);
      }
      if (extra.emailMarketingOptIn !== undefined) {
        payload.email_marketing_opt_in = !!extra.emailMarketingOptIn;
        if (extra.emailMarketingOptIn) {
          payload.email_marketing_opt_in_at = new Date().toISOString();
        }
      }
      if (extra.ucatExamDate !== undefined) {
        payload.ucat_exam_date = extra.ucatExamDate && extra.ucatExamDate.trim() ? extra.ucatExamDate.trim() : null;
      }
    }
    const { error } = await supabase.from("profiles").upsert(
      payload as { id: string; full_name?: string; stream?: string; updated_at: string; ucat_exam_date?: string | null },
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
