// Supabase Edge Function: Add new signups to Mailchimp audience
// Deploy: supabase functions deploy add-mailchimp-subscriber
// Secrets: MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_WEBHOOK_SECRET (for DB trigger)
// Auth: Either (1) webhook: body.secret === MAILCHIMP_WEBHOOK_SECRET and body.record, or
//        (2) Bearer JWT with body.email matching authenticated user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
  entryYear?: string | number;
}

/** auth.users row shape from DB webhook (record) */
interface AuthUserRecord {
  email?: string;
  raw_user_meta_data?: unknown;
}

/** Maps signup year (`2026`) to Mailchimp dropdown labels; choices must match the audience when possible. */
const MAILCHIMP_YEAR_DROPDOWN: Record<string, string> = {
  "2026": "2026 Entry (Starting University September 2026)",
  "2027": "2027 Entry (Starting University September 2027)",
  "2028": "2028 Entry (Starting University September 2028)",
  "2029": "2029 Entry (Starting University September 2029)",
};

/** App signup values → preferred Mailchimp dropdown label. */
const MAILCHIMP_UNI_SUBJECTS = new Set(["Medicine", "Dentistry", "Veterinary Medicine", "Other"]);

const SUBJECT_FIELD_NAMES = ["Uni Subject", "Subject", "uni subject", "subject"];

/** Audience dropdown labelled "Year" (not the text "Entry Year" field). */
const YEAR_DROPDOWN_FIELD_NAMES = ["Year"];

/** Aliases when Mailchimp audience uses shorter labels than the app. */
const SUBJECT_CHOICE_ALIASES: Record<string, string[]> = {
  Medicine: ["medicine"],
  Dentistry: ["dentistry"],
  "Veterinary Medicine": ["Veterinary", "Vet Med", "Veterinary medicine", "Vet"],
  Other: ["other", "Undecided", "undecided"],
};

interface MailchimpMergeFieldMeta {
  tag: string;
  name: string;
  type: string;
  choices: string[];
}

let mergeFieldsCache: { listId: string; fields: MailchimpMergeFieldMeta[] } | null = null;

/**
 * auth.users.raw_user_meta_data can arrive as an object or (rarely) a JSON string.
 * Supabase may also store signup `options.data` keys as snake_case only, but we
 * accept camelCase fallbacks. Numbers are coerced to string for dropdown matching.
 */
function coerceUserMeta(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function metaString(meta: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function normalizeUniSubjectForMailchimp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  if (MAILCHIMP_UNI_SUBJECTS.has(t)) return t;
  if (t === "Undecided") return "Other";
  return "Other";
}

function mailchimpBaseUrl(apiKey: string): string {
  const dcMatch = apiKey.match(/-([a-z0-9]+)$/i);
  const datacenter = dcMatch ? dcMatch[1] : "us1";
  return `https://${datacenter}.api.mailchimp.com/3.0`;
}

function mailchimpHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${btoa(`anystring:${apiKey}`)}`,
  };
}

async function fetchAudienceMergeFields(
  apiKey: string,
  listId: string,
): Promise<MailchimpMergeFieldMeta[]> {
  if (mergeFieldsCache?.listId === listId) return mergeFieldsCache.fields;
  const res = await fetch(`${mailchimpBaseUrl(apiKey)}/lists/${listId}/merge-fields?count=100`, {
    headers: mailchimpHeaders(apiKey),
  });
  const data = (await res.json().catch(() => ({}))) as {
    merge_fields?: Array<{
      tag?: string;
      name?: string;
      type?: string;
      options?: { choices?: string[] };
    }>;
  };
  if (!res.ok) {
    console.warn("Mailchimp: could not load merge fields", res.status, data);
    return [];
  }
  const fields: MailchimpMergeFieldMeta[] = (data.merge_fields ?? [])
    .filter((f) => f.tag && f.name)
    .map((f) => ({
      tag: f.tag!,
      name: f.name!,
      type: f.type ?? "text",
      choices: f.options?.choices ?? [],
    }));
  mergeFieldsCache = { listId, fields };
  return fields;
}

function pickSubjectChoice(stream: string, choices: string[]): string | undefined {
  if (choices.length === 0) return stream;
  if (choices.includes(stream)) return stream;
  const lower = stream.toLowerCase();
  const exactCi = choices.find((c) => c.toLowerCase() === lower);
  if (exactCi) return exactCi;
  for (const alt of SUBJECT_CHOICE_ALIASES[stream] ?? []) {
    const m = choices.find((c) => c.toLowerCase() === alt.toLowerCase());
    if (m) return m;
  }
  if (stream === "Veterinary Medicine") {
    const vet = choices.find((c) => /veterinary|vet\s*med/i.test(c));
    if (vet) return vet;
  }
  const other = choices.find((c) => c.toLowerCase() === "other");
  if (other) return other;
  return undefined;
}

/** Four-digit entry year from signup (`2026`) or from a long label. */
function parseEntryYearDigits(raw: string): string | undefined {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 4) {
    const y = digits.slice(0, 4);
    if (MAILCHIMP_YEAR_DROPDOWN[y]) return y;
  }
  if (MAILCHIMP_YEAR_DROPDOWN[trimmed]) return trimmed;
  return undefined;
}

/** Preferred Mailchimp dropdown label from raw signup metadata. */
function preferredYearDropdownLabel(entryYearRaw: string): string {
  const trimmed = entryYearRaw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 4) {
    const y = digits.slice(0, 4);
    const label = MAILCHIMP_YEAR_DROPDOWN[y];
    if (label) return label;
  }
  if (MAILCHIMP_YEAR_DROPDOWN[trimmed]) return MAILCHIMP_YEAR_DROPDOWN[trimmed]!;
  if (trimmed.toLowerCase() === "other") return "Other";
  return "Other";
}

function pickYearChoice(preferred: string, choices: string[]): string | undefined {
  const usable = choices.filter((c) => !/^please make a selection$/i.test(c.trim()));
  const pool = usable.length > 0 ? usable : choices;
  if (pool.length === 0) return preferred;

  if (pool.includes(preferred)) return preferred;
  const lower = preferred.toLowerCase();
  const exactCi = pool.find((c) => c.toLowerCase() === lower);
  if (exactCi) return exactCi;

  const yearMatch = preferred.match(/\d{4}/);
  const yearDigits = yearMatch ? yearMatch[0] : preferred.replace(/\D/g, "").slice(0, 4);
  if (yearDigits.length === 4) {
    const byPrefix = pool.find((c) => c.startsWith(yearDigits));
    if (byPrefix) return byPrefix;
    const byIncludes = pool.find((c) => c.includes(yearDigits));
    if (byIncludes) return byIncludes;
  }

  if (preferred === "Other" || preferred.toLowerCase() === "other") {
    const other = pool.find((c) => c.trim().toLowerCase() === "other");
    if (other) return other;
  }

  return undefined;
}

async function resolveYearDropdownMerge(
  apiKey: string,
  listId: string,
  entryYearRaw: string,
): Promise<{ tag: string; value: string } | null> {
  const preferred = preferredYearDropdownLabel(entryYearRaw);

  const envTag = Deno.env.get("MAILCHIMP_MERGE_YEAR")?.trim();
  const fields = await fetchAudienceMergeFields(apiKey, listId);

  let yearField: MailchimpMergeFieldMeta | undefined;
  if (envTag) {
    yearField = fields.find((f) => f.tag === envTag);
  }
  if (!yearField) {
    yearField = fields.find((f) => {
      const t = (f.type ?? "text").toLowerCase();
      if (t !== "dropdown" && t !== "radio") return false;
      return YEAR_DROPDOWN_FIELD_NAMES.some((n) => f.name.trim().toLowerCase() === n.toLowerCase());
    });
  }
  if (!yearField) {
    yearField = fields.find((f) => {
      const t = (f.type ?? "text").toLowerCase();
      if (t !== "dropdown" && t !== "radio") return false;
      return /\byear\b/i.test(f.name) && !/\bentry\b/i.test(f.name);
    });
  }
  if (!yearField) {
    yearField = fields.find((f) => f.tag === "MERGE18");
  }
  // Last resort: any dropdown/radio whose choices contain 4-digit year values (20xx)
  if (!yearField) {
    yearField = fields.find((f) => {
      const t = (f.type ?? "text").toLowerCase();
      if (t !== "dropdown" && t !== "radio") return false;
      return f.choices.some((c) => /\b20\d{2}\b/.test(c));
    });
  }

  const tag = yearField?.tag ?? envTag ?? "MERGE18";
  const choices = yearField?.choices ?? [];
  const fallbackChoices =
    choices.length > 0 ? choices : [...new Set(Object.values(MAILCHIMP_YEAR_DROPDOWN).concat(["Other"]))];
  const value = pickYearChoice(preferred, fallbackChoices);
  if (!value) {
    console.warn("Mailchimp: no matching Year dropdown choice", {
      entryYearRaw,
      preferred,
      tag,
      audienceChoices: choices,
    });
    return null;
  }
  return { tag, value: cap(value, 255) };
}

async function resolveSubjectMergeTag(
  apiKey: string,
  listId: string,
  streamRaw: string | undefined,
): Promise<{ tag: string; value: string } | null> {
  const streamNorm = normalizeUniSubjectForMailchimp(
    typeof streamRaw === "string" ? streamRaw.trim() : undefined,
  );
  if (!streamNorm) return null;

  const envTag = Deno.env.get("MAILCHIMP_MERGE_UNI_SUBJECT")?.trim();
  const fields = await fetchAudienceMergeFields(apiKey, listId);

  let subjectField: MailchimpMergeFieldMeta | undefined;
  if (envTag) {
    subjectField = fields.find((f) => f.tag === envTag);
  }
  if (!subjectField) {
    subjectField = fields.find(
      (f) =>
        SUBJECT_FIELD_NAMES.some((n) => f.name.toLowerCase() === n.toLowerCase()) ||
        f.tag === "MERGE19",
    );
  }

  const tag = subjectField?.tag ?? envTag ?? "MERGE19";
  const choices = subjectField?.choices ?? [];
  const value = pickSubjectChoice(streamNorm, choices.length > 0 ? choices : [...MAILCHIMP_UNI_SUBJECTS]);
  if (!value) {
    console.warn("Mailchimp: no matching Subject dropdown for stream", {
      streamRaw,
      streamNorm,
      tag,
      audienceChoices: choices,
    });
    return null;
  }
  return { tag, value: cap(value, STREAM_MAX) };
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

async function buildMergeFields(
  apiKey: string,
  listId: string,
  body: SubscriberPayload,
): Promise<Record<string, string>> {
  const firstName = cap(
    typeof body.firstName === "string" ? body.firstName.trim() : "",
    FIRST_NAME_MAX
  );
  const lastName = cap(
    typeof body.lastName === "string" ? body.lastName.trim() : "",
    LAST_NAME_MAX
  );
  const entryYearRaw =
    typeof body.entryYear === "number" && Number.isFinite(body.entryYear)
      ? String(Math.trunc(body.entryYear))
      : typeof body.entryYear === "string"
        ? body.entryYear.trim()
        : "";

  const merge: Record<string, string> = {};
  if (firstName) merge.FNAME = firstName;
  if (lastName) merge.LNAME = lastName;
  merge.MERGE9 = "skills trainer"; // Sign Up Source
  if (entryYearRaw) {
    const digitsYear = parseEntryYearDigits(entryYearRaw);
    if (digitsYear) {
      merge.MERGE8 = cap(digitsYear, ENTRY_YEAR_MAX); // Entry Year (text), short year only
    }
    const yearDropdown = await resolveYearDropdownMerge(apiKey, listId, entryYearRaw);
    if (yearDropdown) merge[yearDropdown.tag] = yearDropdown.value;
  }

  const subject = await resolveSubjectMergeTag(apiKey, listId, body.stream);
  if (subject) merge[subject.tag] = subject.value;

  return merge;
}

function payloadFromAuthRecord(record: AuthUserRecord): SubscriberPayload | null {
  const email = typeof record?.email === "string" ? record.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const meta = coerceUserMeta(record?.raw_user_meta_data);
  const stream = metaString(meta, "stream");
  const entryYear = metaString(meta, "entry_year", "entryYear");
  if (!stream || !entryYear) {
    console.warn("Mailchimp webhook: missing stream or entry_year in user metadata", {
      keys: Object.keys(meta),
      hasStream: !!stream,
      hasEntryYear: !!entryYear,
    });
  }
  return {
    email,
    firstName: metaString(meta, "first_name", "firstName"),
    lastName: metaString(meta, "last_name", "lastName"),
    stream,
    entryYear,
  };
}

function mailchimpErrorDetail(data: Record<string, unknown>): string {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.title === "string") return data.title;
  return "Unknown Mailchimp error";
}

async function patchMemberMergeFields(
  apiKey: string,
  listId: string,
  email: string,
  mergeFields: Record<string, string>,
): Promise<void> {
  const baseUrl = mailchimpBaseUrl(apiKey);
  const headers = mailchimpHeaders(apiKey);
  const subscriberHash = md5Hex(email);
  const patchRes = await fetch(`${baseUrl}/lists/${listId}/members/${subscriberHash}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ merge_fields: mergeFields }),
  });
  const patchData = (await patchRes.json().catch(() => ({}))) as Record<string, unknown>;
  if (!patchRes.ok) {
    console.error("Mailchimp PATCH merge_fields failed", patchRes.status, patchData, { mergeFields });
    const err = new Error(mailchimpErrorDetail(patchData)) as Error & { status?: number };
    err.status = patchRes.status;
    throw err;
  }
}

async function addToMailchimp(
  apiKey: string,
  listId: string,
  email: string,
  mergeFields: Record<string, string>
): Promise<{ ok: boolean; message: string; merge_fields?: Record<string, string> }> {
  const baseUrl = mailchimpBaseUrl(apiKey);
  const headers = mailchimpHeaders(apiKey);
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
      await patchMemberMergeFields(apiKey, listId, email, mergeFields);
      await addTag();
      return { ok: true, message: "Already subscribed; updated and tagged", merge_fields: mergeFields };
    }
    console.error("Mailchimp API error", res.status, data, { mergeFields });
    const err = new Error(mailchimpErrorDetail(data)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  await addTag();
  return { ok: true, message: "Subscriber added", merge_fields: mergeFields };
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
    const webhookMeta = coerceUserMeta(recordFromBody?.raw_user_meta_data);
    if (webhookMeta["email_marketing_opt_in"] === false) {
      return new Response(
        JSON.stringify({ ok: true, message: "User opted out of email marketing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const subscriberPayload = payloadFromAuthRecord(recordFromBody);
    if (!subscriberPayload) {
      return new Response(
        JSON.stringify({ error: "Valid email is required in record" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const mergeFields = await buildMergeFields(apiKey, listId, subscriberPayload);
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

  const mergeFields = await buildMergeFields(apiKey, listId, userBody);
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
