/**
 * Supabase table names for the planner domain on the unified Skills database.
 * Timetable rows use `plan_sessions` so they never clash with trainer drill `sessions`.
 * Identity rows live in trainer `profiles` (`planner_role` holds student vs tutor for OTP signup).
 */
export const PLAN_TIMETABLE_TABLE = 'plan_sessions' as const

export const PROFILES_TABLE = 'profiles' as const
