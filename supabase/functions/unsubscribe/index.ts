// Supabase Edge Function: one-click unsubscribe from weekly study summaries.
//
// Deploy: supabase functions deploy unsubscribe
// Auth:   none — capability is the per-user unsubscribe_token (a uuid). No secret needed.
//         GET  /functions/v1/unsubscribe?token=<uuid>  → flips opt-out, returns a confirmation page.
//         POST (List-Unsubscribe-Post one-click)       → flips opt-out, returns 200.
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRAINER_URL = "https://ucat.theukcatpeople.co.uk";

function page(title: string, message: string, status: number): Response {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#eef2f7;">
  <div style="max-width:480px;margin:64px auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e2e8f2;text-align:center;">
    <div style="color:#0b3d91;font-size:14px;font-weight:700;letter-spacing:.02em;margin-bottom:16px;">THEUKCATPEOPLE</div>
    <h1 style="font-size:20px;color:#0b1f44;margin:0 0 10px;">${title}</h1>
    <p style="font-size:15px;color:#33425b;line-height:1.5;margin:0 0 22px;">${message}</p>
    <a href="${TRAINER_URL}" style="display:inline-block;background:#0b3d91;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:11px 20px;border-radius:10px;">Back to the trainer</a>
  </div>
</body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function applyOptOut(token: string): Promise<"ok" | "not-found" | "error"> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return "error";
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("profiles")
    .update({ weekly_summary_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id");
  if (error) {
    console.error("unsubscribe update failed", error);
    return "error";
  }
  return data && data.length > 0 ? "ok" : "not-found";
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") ?? "").trim();

  // One-click (RFC 8058): mail clients POST here. Always answer 200 so the client
  // shows success; opt-out is best-effort.
  if (req.method === "POST") {
    if (UUID_RE.test(token)) await applyOptOut(token);
    return new Response("ok", { status: 200 });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!UUID_RE.test(token)) {
    return page("Invalid link", "This unsubscribe link looks malformed or incomplete. Please use the link from a recent email.", 400);
  }

  const outcome = await applyOptOut(token);
  if (outcome === "ok") {
    return page("You're unsubscribed", "You won't receive any more weekly study summaries. Changed your mind? Email hello@ucat.theukcatpeople.co.uk and we'll switch them back on.", 200);
  }
  if (outcome === "not-found") {
    return page("Already handled", "This link is no longer active — you may already be unsubscribed.", 200);
  }
  return page("Something went wrong", "We couldn't update your preferences just now. Please try again shortly.", 500);
});
