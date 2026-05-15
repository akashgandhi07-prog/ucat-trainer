/** Only allow http(s) so misconfigured env cannot inject javascript: links. */
export function safeHttpPlannerUrl(raw: unknown): string | null {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function plannerAppBase(): string | null {
  return safeHttpPlannerUrl(import.meta.env.VITE_PLANNER_URL);
}

/** Absolute URL to a path on the deployed Next planner (leading slash on path). */
export function plannerPath(path: string): string | null {
  const base = plannerAppBase();
  if (!base) return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export const PLANNER_ROUTES = {
  dashboard: "/dashboard",
  plan: "/dashboard/plan",
  mockScores: "/dashboard/scores",
  onboarding: "/onboarding",
} as const;
