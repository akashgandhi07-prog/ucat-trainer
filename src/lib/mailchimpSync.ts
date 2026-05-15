import { supabase } from "./supabase";
import { authLog } from "./logger";

/** Push signup fields to Mailchimp (backup when DB webhook is delayed or user already exists). */
export async function syncSignupToMailchimp(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    stream: string;
    entryYear: string;
  },
  caller?: string,
): Promise<boolean> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!base || !anon) {
    return false;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    authLog.info("Mailchimp client sync skipped (no session; DB webhook handles signup)");
    return false;
  }

  try {
    const res = await fetch(`${base}/functions/v1/add-mailchimp-subscriber`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        stream: input.stream,
        entryYear: input.entryYear,
      }),
    });
    const rawBody = await res.text().catch(() => "");
    if (!res.ok) {
      authLog.warn("Mailchimp client sync failed", {
        caller: caller ?? "unknown",
        status: res.status,
        body: rawBody.slice(0, 200),
      });
      return false;
    }
    authLog.info("Mailchimp client sync ok");
    return true;
  } catch (err) {
    authLog.warn("Mailchimp client sync error", err);
    return false;
  }
}
