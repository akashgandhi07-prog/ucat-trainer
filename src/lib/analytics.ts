/**
 * Product analytics module. Sends events to Supabase analytics_events table.
 * Session ID persists in sessionStorage per tab. Honors analytics opt-out.
 * Payloads are capped to match DB constraints and prevent abuse.
 */

import { supabase } from "./supabase";

const SESSION_ID_KEY = "ucat_analytics_session_id";
const OPT_OUT_KEY = "ucat_analytics_opt_out";

const PATHNAME_MAX = 2048;
const REFERRER_MAX = 2048;
const EVENT_NAME_MAX = 128;
const SESSION_ID_MAX = 64;
const EVENT_PROPERTIES_MAX_BYTES = 10000;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max);
}

/** Sanitize event_properties so serialized size is within limit; returns plain object. */
function capEventProperties(
  props: Record<string, string | number | boolean | null | undefined> | null | undefined
): Record<string, string | number | boolean | null | undefined> {
  if (!props || typeof props !== "object" || Array.isArray(props)) return {};
  const out: Record<string, string | number | boolean | null | undefined> = {};
  for (const k of Object.keys(props)) {
    const key = truncate(String(k), 128);
    const v = props[k];
    if (v === null || v === undefined) out[key] = null;
    else if (typeof v === "string") out[key] = truncate(v, 500);
    else if (typeof v === "number" || typeof v === "boolean") out[key] = v;
  }
  let s = JSON.stringify(out);
  while (s.length > EVENT_PROPERTIES_MAX_BYTES && Object.keys(out).length > 0) {
    const lastKey = Object.keys(out).pop()!;
    delete out[lastKey];
    s = JSON.stringify(out);
  }
  return out;
}

let _activeTrainer: {
  training_type: string;
  phase: string;
  started_at: number;
} | null = null;

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== "true";
  } catch {
    return true;
  }
}

/** Call when user starts a drill. Used for abandonment tracking. */
export function setActiveTrainer(training_type: string, phase: string): void {
  _activeTrainer = { training_type, phase, started_at: Date.now() };
}

/** Call when user completes or explicitly leaves a drill. */
export function clearActiveTrainer(): void {
  _activeTrainer = null;
}

/** Get active trainer for abandonment event (consumes and clears). */
function takeActiveTrainer(): { training_type: string; phase: string; time_spent_seconds: number } | null {
  if (!_activeTrainer) return null;
  const elapsed = Math.floor((Date.now() - _activeTrainer.started_at) / 1000);
  const out = { ..._activeTrainer, time_spent_seconds: elapsed };
  _activeTrainer = null;
  return out;
}

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Track an analytics event. Fire-and-forget; errors are logged but not thrown.
 */
export async function trackEvent(
  event_name: string,
  properties?: EventProperties
): Promise<void> {
  if (!isAnalyticsEnabled()) return;
  if (typeof window === "undefined") return;

  try {
    const rawSessionId = getOrCreateSessionId();
    const session_id = truncate(rawSessionId, SESSION_ID_MAX);
    const { data: { user } } = await supabase.auth.getUser();
    const pathname = truncate(window.location.pathname, PATHNAME_MAX);
    const referrer = truncate(document.referrer || "", REFERRER_MAX) || undefined;

    const payload = {
      user_id: user?.id ?? null,
      session_id,
      event_name: truncate(event_name, EVENT_NAME_MAX),
      event_properties: capEventProperties(properties ?? {}),
      pathname,
      referrer: referrer || null,
    };

    const { error } = await supabase.from("analytics_events").insert(payload);
    if (error) {
      console.warn("[Analytics] Failed to insert event:", error.message);
    }
  } catch (err) {
    console.warn("[Analytics] Error tracking event:", err);
  }
}

/**
 * Track a page view. Call on route change.
 */
export function trackPageView(): void {
  trackEvent("page_view", {
    pathname: window.location.pathname,
    referrer: document.referrer || undefined,
    title: document.title,
  });
}

/**
 * Send trainer_abandoned using sendBeacon if available, else fetch.
 * Used on visibilitychange/beforeunload when we can't await Supabase.
 */
function sendAbandonmentSync(
  user_id: string | null,
  session_id: string,
  training_type: string,
  phase: string,
  time_spent_seconds: number
): void {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const payload = {
    user_id,
    session_id: truncate(session_id, SESSION_ID_MAX),
    event_name: "trainer_abandoned",
    event_properties: capEventProperties({ training_type, phase, time_spent_seconds }),
    pathname: truncate(window.location.pathname, PATHNAME_MAX),
    referrer: truncate(document.referrer || "", REFERRER_MAX) || undefined,
  };

  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: "return=minimal",
  };

  fetch(`${url}/rest/v1/analytics_events`, {
    method: "POST",
    body,
    headers,
    keepalive: true,
  }).catch(() => {});
}

function setupAbandonmentListeners(): void {
  function maybeSendAbandoned(): void {
    const active = takeActiveTrainer();
    if (!active || !isAnalyticsEnabled()) return;
    const session_id = getOrCreateSessionId();
    sendAbandonmentSync(
      null, // user_id: we don't have async auth in unload, use null for now
      session_id,
      active.training_type,
      active.phase,
      active.time_spent_seconds
    );
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      maybeSendAbandoned();
    }
  });

  window.addEventListener("pagehide", maybeSendAbandoned);
}

if (typeof window !== "undefined") {
  setupAbandonmentListeners();
}
