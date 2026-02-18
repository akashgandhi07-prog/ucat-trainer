/**
 * Simple namespaced logger for auth, dashboard, and Supabase operations.
 * In development logs to console; can be extended to send to a service.
 *
 * IMPORTANT:
 * - info() is dev-only and should never be wired to a production log shipper.
 * - warn()/error() redact common PII fields when not in dev so that any
 *   future server-side log forwarding does not leak sensitive user data.
 */

const isDev = import.meta.env.DEV;

const PII_KEYS = new Set([
  "email",
  "userId",
  "user_id",
  "full_name",
  "name",
  "first_name",
  "last_name",
  "entry_year",
  "stream",
]);

function redactPii(meta: unknown): unknown {
  if (!meta || typeof meta !== "object") {
    // Scrub emails from plain string values (e.g. Supabase error messages)
    if (!isDev && typeof meta === "string" && meta.includes("@")) {
      return meta.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email-redacted]");
    }
    return meta;
  }
  if (!isDev) {
    if (Array.isArray(meta)) return meta.map(redactPii);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (PII_KEYS.has(k)) {
        out[k] = "[redacted]";
      } else if (v && typeof v === "object") {
        out[k] = redactPii(v);
      } else if (typeof v === "string" && v.includes("@")) {
        out[k] = v.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email-redacted]");
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return meta;
}

function formatMessage(scope: string, message: string): string {
  return `[${scope}] ${message}`;
}

function createLogger(scope: string) {
  return {
    info(message: string, meta?: unknown) {
      if (isDev) {
        if (meta !== undefined) console.log(formatMessage(scope, message), redactPii(meta));
        else console.log(formatMessage(scope, message));
      }
    },
    warn(message: string, meta?: unknown) {
      if (meta !== undefined) console.warn(formatMessage(scope, message), redactPii(meta));
      else console.warn(formatMessage(scope, message));
    },
    error(message: string, err?: unknown) {
      if (err !== undefined) console.error(formatMessage(scope, message), redactPii(err));
      else console.error(formatMessage(scope, message));
    },
  };
}

export const authLog = createLogger("Auth");
export const dashboardLog = createLogger("Dashboard");
export const supabaseLog = createLogger("Supabase");
