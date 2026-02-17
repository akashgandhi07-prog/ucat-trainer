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
  if (!meta || typeof meta !== "object") return meta;
  if (!isDev) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      out[k] = PII_KEYS.has(k) ? "[redacted]" : v;
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
