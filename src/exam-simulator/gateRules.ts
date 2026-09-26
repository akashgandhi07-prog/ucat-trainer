// Pure access rules for the mock exam and question database entries. Kept free
// of Supabase and React imports so scripts/verify-exam-simulator.ts can test it.

/** "signed-in": any account. "staff": trainer admins or planner tutors only. */
export type GateMode = "signed-in" | "staff";

export type GateStatus =
  "loading" | "allowed" | "signed-out" | "forbidden" | "error";

export type GateProfile = {
  role?: string | null;
  planner_role?: string | null;
} | null;

/**
 * The gate is only enforced when the build sets
 * VITE_EXAM_SIMULATOR_REQUIRE_AUTH=true. Unset (local use) stays open.
 */
export function gateRequired(env: Record<string, unknown>): boolean {
  return env.VITE_EXAM_SIMULATOR_REQUIRE_AUTH === "true";
}

/**
 * Same role model as the main app (see docs/ACCESS_RLS_MATRIX.md):
 * profiles.role is "user" | "admin"; profiles.planner_role is
 * "student" | "tutor" | null.
 */
export function isStaffProfile(profile: GateProfile): boolean {
  return profile?.role === "admin" || profile?.planner_role === "tutor";
}

export function decideAccess(
  mode: GateMode,
  userId: string | null,
  profile: GateProfile,
): Exclude<GateStatus, "loading" | "error"> {
  if (!userId) return "signed-out";
  if (mode === "signed-in") return "allowed";
  return isStaffProfile(profile) ? "allowed" : "forbidden";
}
