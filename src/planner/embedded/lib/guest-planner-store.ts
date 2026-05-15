'use client'

import type {
  DBMockScore,
  DBPlan,
  DBPlanDay,
  DBPlanWeek,
  DBSession,
} from '@/types'

const STORAGE_KEY = 'ukcat_guest_planner_v1'

export type GuestSessionCompletion = {
  session_id: string
  minutes_completed: number
  perceived_effort: number | null
}

export type GuestPlannerBundle = {
  plan: DBPlan
  planWeeks: DBPlanWeek[]
  planDays: DBPlanDay[]
  sessions: DBSession[]
  completions: GuestSessionCompletion[]
  mockScores: DBMockScore[]
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

export function saveGuestPlanner(bundle: GuestPlannerBundle): void {
  if (!isBrowser()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle))
}

export function clearGuestPlanner(): void {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEY)
}

export function hasGuestPlanner(): boolean {
  return getGuestPlanner() != null
}

export function upsertGuestCompletion(
  sessionId: string,
  completed: boolean,
  minutesCompleted: number | null,
  perceivedEffort: number | null,
): void {
  const bundle = getGuestPlanner()
  if (!bundle) return
  const rest = bundle.completions.filter((c) => c.session_id !== sessionId)
  if (completed && minutesCompleted != null) {
    rest.push({
      session_id: sessionId,
      minutes_completed: minutesCompleted,
      perceived_effort: perceivedEffort,
    })
  }
  saveGuestPlanner({ ...bundle, completions: rest })
}

export function addGuestMockScore(score: Omit<DBMockScore, 'id' | 'created_at'>): DBMockScore {
  const bundle = getGuestPlanner()
  if (!bundle) throw new Error('No guest plan')
  const row: DBMockScore = {
    ...score,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  saveGuestPlanner({
    ...bundle,
    mockScores: [...bundle.mockScores, row],
  })
  return row
}

export function updateGuestMockTargets(
  mockTargetTotal: number | null,
  mockTargetSjtBand: number | null,
): void {
  const bundle = getGuestPlanner()
  if (!bundle) return
  saveGuestPlanner({
    ...bundle,
    plan: {
      ...bundle.plan,
      mock_target_total: mockTargetTotal,
      mock_target_sjt_band: mockTargetSjtBand,
    },
  })
}

export function guestCompletionsMap(
  bundle: GuestPlannerBundle,
): Map<string, { minutes: number; perceived: number | null }> {
  const m = new Map<string, { minutes: number; perceived: number | null }>()
  for (const c of bundle.completions) {
    m.set(c.session_id, {
      minutes: c.minutes_completed,
      perceived: c.perceived_effort,
    })
  }
  return m
}
