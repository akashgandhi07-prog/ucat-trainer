/**
 * Base URL for the site (e.g. https://ucat.theukcatpeople.co.uk).
 * Set VITE_SITE_URL in production for consistent canonicals and sitemap.
 */
export function getSiteBaseUrl(): string {
  const env = import.meta.env.VITE_SITE_URL;
  if (typeof env === "string" && env.trim()) {
    return env.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** The one origin on the Supabase auth redirect allow-list. */
export const AUTH_REDIRECT_ORIGIN = "https://ucat.theukcatpeople.co.uk";

/**
 * Base URL for Supabase auth email links (password reset).
 *
 * Supabase honours `redirect_to` only when it is on the project's allow-list; anything
 * else is silently swapped for the Site URL, which drops the user on the home page
 * holding a live recovery token and no password form. The allow-list holds a single
 * origin, so these links must always point there - unlike canonicals, this must NOT
 * fall back to window.location.origin, or resets requested from localhost and Vercel
 * previews generate links Supabase rewrites. Set VITE_SITE_URL to override, which is
 * only useful once that origin is allow-listed too.
 */
export function getAuthRedirectBaseUrl(): string {
  const env = import.meta.env.VITE_SITE_URL;
  if (typeof env === "string" && env.trim()) {
    return env.trim().replace(/\/+$/, "");
  }
  return AUTH_REDIRECT_ORIGIN;
}
