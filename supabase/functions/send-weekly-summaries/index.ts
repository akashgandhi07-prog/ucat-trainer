// Supabase Edge Function: send weekly UCAT study-summary emails via Resend.
//
// Deploy:  supabase functions deploy send-weekly-summaries
// Secrets: RESEND_API_KEY, WEEKLY_SUMMARY_CRON_SECRET
//          (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)
// Invoked weekly by pg_cron (see migration) with body { secret } === WEEKLY_SUMMARY_CRON_SECRET.
// Manual test:
//   curl -i -X POST "$SUPABASE_URL/functions/v1/send-weekly-summaries" \
//     -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
//     -d '{"secret":"<cron-secret>","dryRun":true}'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM = "TheUKCATPeople <hello@ucat.theukcatpeople.co.uk>";
const REPLY_TO = "hello@ucat.theukcatpeople.co.uk";
const TRAINER_URL = "https://ucat.theukcatpeople.co.uk";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_CONCURRENCY = 5;

interface SummaryRow {
  user_id: string;
  email: string;
  first_name: string | null;
  unsubscribe_token: string;
  sessions_count: number;
  correct_sum: number;
  total_sum: number;
  study_seconds: number;
  active_days: number;
  planned_sessions: number;
  completed_sessions: number;
}

/** Mon–Sun ISO week that ends on (or most recently ended before) `ref`, in UTC date terms. */
function isoWeekRange(ref: Date): { weekStart: string; weekEnd: string } {
  const day = ref.getUTCDay(); // 0 = Sun … 6 = Sat
  const offsetToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - offsetToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { weekStart: iso(monday), weekEnd: iso(sunday) };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function formatStudyTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function renderEmail(row: SummaryRow, weekStart: string, weekEnd: string, unsubscribeUrl: string): RenderedEmail {
  const name = row.first_name?.trim() || "there";
  const accuracy = row.total_sum > 0 ? Math.round((row.correct_sum / row.total_sum) * 100) : null;
  const studyTime = formatStudyTime(row.study_seconds);
  const adherence =
    row.planned_sessions > 0
      ? Math.round((row.completed_sessions / row.planned_sessions) * 100)
      : null;
  const range = `${prettyDate(weekStart)} – ${prettyDate(weekEnd)}`;

  const subject =
    row.sessions_count > 0
      ? `Your UCAT week: ${row.sessions_count} ${row.sessions_count === 1 ? "session" : "sessions"}${accuracy !== null ? `, ${accuracy}% accuracy` : ""}`
      : `Your UCAT week — a quick nudge`;

  const stat = (label: string, value: string) => `
    <td style="padding:10px 8px;text-align:center;background:#f6f8fb;border-radius:10px;">
      <div style="font-size:22px;font-weight:700;color:#0b3d91;line-height:1.1;">${value}</div>
      <div style="font-size:11px;color:#5b6b86;text-transform:uppercase;letter-spacing:.04em;margin-top:4px;">${label}</div>
    </td>`;

  const statCells = [
    stat("Sessions", String(row.sessions_count)),
    stat("Active days", String(row.active_days)),
    accuracy !== null ? stat("Accuracy", `${accuracy}%`) : null,
    row.study_seconds > 0 ? stat("Study time", studyTime) : null,
  ].filter(Boolean);

  // Lay stats out two-per-row.
  let statRows = "";
  for (let i = 0; i < statCells.length; i += 2) {
    const left = statCells[i];
    const right = statCells[i + 1] ?? `<td style="background:transparent;"></td>`;
    statRows += `<tr>${left}<td style="width:10px;"></td>${right}</tr><tr><td colspan="3" style="height:10px;"></td></tr>`;
  }

  const adherenceBlock =
    adherence !== null
      ? `<p style="margin:0 0 16px;font-size:15px;color:#33425b;line-height:1.5;">
           You completed <strong>${row.completed_sessions} of ${row.planned_sessions}</strong> planned study
           sessions this week (<strong>${adherence}%</strong> of your plan).
         </p>`
      : "";

  const encouragement =
    row.sessions_count === 0
      ? `<p style="margin:0 0 16px;font-size:15px;color:#33425b;line-height:1.5;">
           No drills logged this week — that's OK. A single two-minute session today rebuilds momentum.
           Pick any trainer and start where you left off.
         </p>`
      : `<p style="margin:0 0 16px;font-size:15px;color:#33425b;line-height:1.5;">
           Nice work keeping the reps up. Speed and pattern-recognition compound — a few minutes daily across
           sections is what makes full mocks feel easier.
         </p>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f2;">
        <tr><td style="background:#0b3d91;padding:20px 28px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.02em;">THEUKCATPEOPLE</div>
          <div style="color:#aac4f5;font-size:12px;margin-top:2px;">Your weekly UCAT summary · ${range}</div>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#0b1f44;">Hi ${escapeHtml(name)},</h1>
          ${encouragement}
        </td></tr>
        <tr><td style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${statRows}</table>
        </td></tr>
        <tr><td style="padding:8px 28px 4px;">${adherenceBlock}</td></tr>
        <tr><td style="padding:8px 28px 28px;">
          <a href="${TRAINER_URL}" style="display:inline-block;background:#0b3d91;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:10px;">Open the trainer →</a>
        </td></tr>
        <tr><td style="padding:18px 28px;background:#f6f8fb;border-top:1px solid #e2e8f2;">
          <p style="margin:0 0 6px;font-size:12px;color:#7a8aa3;line-height:1.5;">
            You're receiving this because you have a TheUKCATPeople account.
            <a href="${unsubscribeUrl}" style="color:#0b3d91;">Unsubscribe from weekly summaries</a>.
          </p>
          <p style="margin:0;font-size:12px;color:#9aa8bd;">TheUKCATPeople · UCAT skills trainer</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const textLines = [
    `Hi ${name},`,
    "",
    `Your UCAT week (${range}):`,
    `- Sessions: ${row.sessions_count}`,
    `- Active days: ${row.active_days}`,
    accuracy !== null ? `- Accuracy: ${accuracy}%` : null,
    row.study_seconds > 0 ? `- Study time: ${studyTime}` : null,
    adherence !== null
      ? `- Plan: ${row.completed_sessions}/${row.planned_sessions} sessions completed (${adherence}%)`
      : null,
    "",
    `Open the trainer: ${TRAINER_URL}`,
    "",
    `Unsubscribe from weekly summaries: ${unsubscribeUrl}`,
  ].filter((l) => l !== null);

  return { subject, html, text: textLines.join("\n") };
}

async function sendViaResend(
  apiKey: string,
  row: SummaryRow,
  email: RenderedEmail,
  unsubscribeUrl: string,
): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [row.email],
      reply_to: REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/** Timing-safe-ish secret comparison. */
function secretMatches(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("WEEKLY_SUMMARY_CRON_SECRET");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!cronSecret || !resendKey || !supabaseUrl || !serviceKey) {
    console.error("send-weekly-summaries: missing required env", {
      hasCronSecret: !!cronSecret,
      hasResendKey: !!resendKey,
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
    });
    return new Response(JSON.stringify({ error: "Function not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const providedSecret = typeof body.secret === "string" ? body.secret : "";
  if (!secretMatches(providedSecret, cronSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dryRun = body.dryRun === true;
  // Allow manual override of the week window; otherwise the current Mon–Sun ISO week.
  const { weekStart, weekEnd } =
    typeof body.weekStart === "string" && typeof body.weekEnd === "string"
      ? { weekStart: body.weekStart, weekEnd: body.weekEnd }
      : isoWeekRange(new Date());

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: rows, error: rpcError } = await supabase.rpc("weekly_summary_data", {
    p_week_start: weekStart,
    p_week_end: weekEnd,
  });
  if (rpcError) {
    console.error("weekly_summary_data RPC failed", rpcError);
    return new Response(JSON.stringify({ error: "Failed to load summary data", detail: rpcError.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // PostgREST serialises bigint/numeric as strings — coerce to numbers so the
  // arithmetic and strict comparisons below behave.
  const candidates: SummaryRow[] = ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    user_id: String(r.user_id),
    email: typeof r.email === "string" ? r.email : "",
    first_name: typeof r.first_name === "string" ? r.first_name : null,
    unsubscribe_token: String(r.unsubscribe_token),
    sessions_count: Number(r.sessions_count) || 0,
    correct_sum: Number(r.correct_sum) || 0,
    total_sum: Number(r.total_sum) || 0,
    study_seconds: Number(r.study_seconds) || 0,
    active_days: Number(r.active_days) || 0,
    planned_sessions: Number(r.planned_sessions) || 0,
    completed_sessions: Number(r.completed_sessions) || 0,
  }));

  // Idempotency: skip users already logged for this week.
  const { data: existing } = await supabase
    .from("weekly_summary_log")
    .select("user_id")
    .eq("week_start", weekStart);
  const alreadySent = new Set((existing ?? []).map((r: { user_id: string }) => r.user_id));

  const toSend = candidates.filter(
    (r) =>
      !alreadySent.has(r.user_id) &&
      r.email &&
      (r.sessions_count > 0 || r.planned_sessions > 0),
  );

  const result = { weekStart, weekEnd, candidates: candidates.length, sent: 0, failed: 0, skipped: candidates.length - toSend.length, dryRun };

  if (dryRun) {
    return new Response(JSON.stringify({ ...result, sampleSubjects: toSend.slice(0, 5).map((r) => renderEmail(r, weekStart, weekEnd, "https://example/unsub").subject) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Bounded-concurrency send pool.
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < toSend.length) {
      const row = toSend[cursor++];
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/unsubscribe?token=${row.unsubscribe_token}`;
      const email = renderEmail(row, weekStart, weekEnd, unsubscribeUrl);
      try {
        await sendViaResend(resendKey, row, email, unsubscribeUrl);
        await supabase
          .from("weekly_summary_log")
          .upsert({ user_id: row.user_id, week_start: weekStart, status: "sent" }, { onConflict: "user_id,week_start" });
        result.sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "send failed";
        console.error("weekly summary send failed", { userId: row.user_id, message });
        await supabase
          .from("weekly_summary_log")
          .upsert(
            { user_id: row.user_id, week_start: weekStart, status: "failed", error: message.slice(0, 500) },
            { onConflict: "user_id,week_start" },
          );
        result.failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(SEND_CONCURRENCY, toSend.length) }, () => worker()));

  console.info("weekly summary run complete", result);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
