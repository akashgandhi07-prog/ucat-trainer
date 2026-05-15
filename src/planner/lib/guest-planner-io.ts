/** Guest planner localStorage (trainer-safe; no embedded @/ imports for tsc). */

const STORAGE_KEY = 'ukcat_guest_planner_v1'

export type GuestPlannerBundle = {
  plan: Record<string, unknown> & { id: string; slug?: string }
  planWeeks: Array<Record<string, unknown> & { id: string; plan_id?: string }>
  planDays: Array<Record<string, unknown> & { id: string; plan_id?: string; plan_week_id?: string | null }>
  sessions: Array<Record<string, unknown> & { id: string; plan_id?: string; plan_day_id?: string | null }>
  completions: Array<{
    session_id: string
    minutes_completed: number
    perceived_effort: number | null
  }>
  mockScores: Array<Record<string, unknown> & { id?: string; session_id?: string | null; created_at?: string }>
}

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function getGuestPlanner(): GuestPlannerBundle | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GuestPlannerBundle
    if (!parsed?.plan?.id || !Array.isArray(parsed.sessions)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearGuestPlanner(): void {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEY)
}

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export { generateSlug }
