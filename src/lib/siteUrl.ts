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
