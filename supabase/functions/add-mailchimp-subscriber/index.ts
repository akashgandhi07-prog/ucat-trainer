// Supabase Edge Function: Add new signups to Mailchimp audience
// Deploy: supabase functions deploy add-mailchimp-subscriber
// Secrets: MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_WEBHOOK_SECRET (for DB trigger)
// Auth: Either (1) webhook: body.secret === MAILCHIMP_WEBHOOK_SECRET and body.record, or
//        (2) Bearer JWT with body.email matching authenticated user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ucat.theukcatpeople.co.uk",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const FIRST_NAME_MAX = 100;
const LAST_NAME_MAX = 100;
const STREAM_MAX = 100;
const ENTRY_YEAR_MAX = 20;
const RATE_LIMIT_MS = 60_000;

// In-memory rate limit: uid -> last request timestamp (per instance)
const rateLimitMap = new Map<string, number>();

interface SubscriberPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  stream?: string;
  entryYear?: string;
}

/** auth.users row shape from DB webhook (record) */
interface AuthUserRecord {
  email?: string;
  raw_user_meta_data?: Record<string, unknown>;
}

// Minimal MD5 for Mailchimp subscriber_hash (lowercase email -> hex)
function md5Hex(s: string): string {
  const utf8 = new TextEncoder().encode(s);
  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);
  const rot = (v: number, n: number) => (v << n) | (v >>> (32 - n));
  const add = (a: number, b: number) => ((a + b) >>> 0) & 0xffffffff;

  const K = new Uint32Array(64);
  for (let i = 0; i < 64; i++) K[i] = (0x100000000 * Math.abs(Math.sin(i + 1))) >>> 0;
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

  const len = utf8.length;
  const numBlocks = Math.ceil((len + 9) / 64);
  const totalBytes = numBlocks * 64;
  const buf = new Uint8Array(totalBytes);
  buf.set(utf8);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  const lenBits = len * 8;
  view.setUint32(totalBytes - 8, lenBits & 0xffffffff, true);
  view.setUint32(totalBytes - 4, Math.floor(lenBits / 0x100000000), true);
  const M = new Uint32Array(16);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let block = 0; block < numBlocks; block++) {
    for (let i = 0; i < 16; i++) M[i] = view.getUint32((block * 64) + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) {
        f = F(B, C, D);
        g = i;
      } else if (i < 32) {
        f = G(B, C, D);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = H(B, C, D);
        g = (3 * i + 5) % 16;
      } else {
        f = I(B, C, D);
        g = (7 * i) % 16;
      }
      f = add(add(add(f, A), K[i]), M[g]);
      A = D;
      D = C;
      C = B;
      B = add(B, rot(f, S[i]));
    }
    a0 = add(a0, A);
    b0 = add(b0, B);
    c0 = add(c0, C);
    d0 = add(d0, D);
  }
  return [a0, b0, c0, d0].map((x) => {
    const b = new ArrayBuffer(4);
    new DataView(b).setUint32(0, x, true);
    return Array.from(new Uint8Array(b)).map((c) => c.toString(16).padStart(2, "0")).join("");
  }).join("");
}

function cap(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function buildMergeFields(body: SubscriberPayload): Record<string, string> {
  const firstName = cap(
    typeof body.firstName === "string" ? body.firstName.trim() : "",
    FIRST_NAME_MAX
  );
  const lastName = cap(
    typeof body.lastName === "string" ? body.lastName.trim() : "",
    LAST_NAME_MAX
  );
  const stream = cap(
    typeof body.stream === "string" ? body.stream.trim() : "",
    STREAM_MAX
  );
  const entryYear = cap(
    typeof body.entryYear === "string" ? body.entryYear.trim() : "",
    ENTRY_YEAR_MAX
  );

  const merge: Record<string, string> = {};
  if (firstName) merge.FNAME = firstName;
  if (lastName) merge.LNAME = lastName;
  merge.MERGE9 = "skills trainer"; // Sign Up Source
  if (entryYear) {
    merge.MERGE8 = entryYear; // Entry Year (text)
    const y = entryYear.replace(/\D/g, "");
    if (["2026", "2027", "2028", "2029"].includes(y)) {
      merge.MERGE18 = `${y} Entry (Starting University September ${y})`; // Year dropdown
    } else {
      merge.MERGE18 = "Other";
    }
  }
  if (stream) merge.MERGE19 = stream; // Uni Subject

  return merge;
}

function payloadFromAuthRecord(record: AuthUserRecord): SubscriberPayload | null {
  const email = typeof record?.email === "string" ? record.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const meta = record?.raw_user_meta_data && typeof record.raw_user_meta_data === "object" ? record.raw_user_meta_data : {};
  return {
    email,
    firstName: typeof meta.first_name === "string" ? meta.first_name : undefined,
    lastName: typeof meta.last_name === "string" ? meta.last_name : undefined,
    stream: typeof meta.stream === "string" ? meta.stream : undefined,
    entryYear: typeof meta.entry_year === "string" ? meta.entry_year : undefined,
  };
}

async function addToMailchimp(
  apiKey: string,
  listId: string,
  email: string,
  mergeFields: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  const dcMatch = apiKey.match(/-([a-z0-9]+)$/i);
  const datacenter = dcMatch ? dcMatch[1] : "us1";
  const baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`;
  const auth = btoa(`anystring:${apiKey}`);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Basic ${auth}`,
  };
  const addTag = async (): Promise<void> => {
    const subscriberHash = md5Hex(email);
    await fetch(`${baseUrl}/lists/${listId}/members/${subscriberHash}/tags`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tags: [{ name: "skillstrainer", status: "active" }] }),
    });
  };
  const payload = {
    email_address: email,
    status: "subscribed" as const,
    merge_fields: Object.keys(mergeFields).length > 0 ? mergeFields : undefined,
  };
  const res = await fetch(`${baseUrl}/lists/${listId}/members`, { method: "POST", headers, body: JSON.stringify(payload) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    if (res.status === 400 && data?.title === "Member Exists") {
      const subscriberHash = md5Hex(email);
      await fetch(`${baseUrl}/lists/${listId}/members/${subscriberHash}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ merge_fields: mergeFields }),
      });
      await addTag();
      return { ok: true, message: "Already subscribed; updated and tagged" };
    }
    const detail = typeof data?.detail === "string" ? data.detail : (data?.title as string) || "Unknown";
    console.error("Mailchimp API error", res.status, data);
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  await addTag();
  return { ok: true, message: "Subscriber added" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("MAILCHIMP_API_KEY");
  const listId = Deno.env.get("MAILCHIMP_LIST_ID");
  const webhookSecret = Deno.env.get("MAILCHIMP_WEBHOOK_SECRET");

  if (!apiKey || !listId) {
    console.error("MAILCHIMP_API_KEY or MAILCHIMP_LIST_ID not configured");
    return new Response(
      JSON.stringify({ error: "Mailchimp integration not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const body = rawBody as Record<string, unknown> | null;
  const headerSecret = req.headers.get("x-webhook-secret");
  const hasWebhookSecret = typeof webhookSecret === "string" && webhookSecret.length > 0;
  const recordFromBody = body?.record as AuthUserRecord | undefined;
  const bodySecret = body?.secret;
  const isWebhookBySecret =
    hasWebhookSecret &&
    (bodySecret === webhookSecret || headerSecret === webhookSecret) &&
    recordFromBody &&
    typeof recordFromBody === "object";

  if (isWebhookBySecret) {
    const subscriberPayload = payloadFromAuthRecord(recordFromBody);
    if (!subscriberPayload) {
      return new Response(
        JSON.stringify({ error: "Valid email is required in record" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const mergeFields = buildMergeFields(subscriberPayload);
    try {
      const result = await addToMailchimp(apiKey, listId, subscriberPayload.email, mergeFields);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add subscriber";
      const status = (err as { status?: number }).status;
      console.error("Mailchimp webhook request failed", err);
      const body: { error: string; detail?: string } = { error: "Failed to add subscriber" };
      if (status && message) body.detail = `Mailchimp ${status}: ${message}`;
      else if (message) body.detail = message;
      return new Response(
        JSON.stringify(body),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authorization required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const { data: { user }, error: authError } = await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token);
  if (authError || !user?.email) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userBody = body as SubscriberPayload;
  const email = typeof userBody?.email === "string" ? userBody.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: "Valid email is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (user.email.toLowerCase() !== email) {
    return new Response(
      JSON.stringify({ error: "Email must match your account" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = Date.now();
  const uid = user.id;
  const last = rateLimitMap.get(uid);
  if (last != null && now - last < RATE_LIMIT_MS) {
    return new Response(
      JSON.stringify({ error: "Please try again in a minute" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  rateLimitMap.set(uid, now);
  for (const [k, t] of rateLimitMap.entries()) {
    if (now - t > RATE_LIMIT_MS) rateLimitMap.delete(k);
  }

  const mergeFields = buildMergeFields(userBody);
  try {
    const result = await addToMailchimp(apiKey, listId, email, mergeFields);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Mailchimp request failed", err);
    return new Response(
      JSON.stringify({ error: "Failed to add subscriber" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
