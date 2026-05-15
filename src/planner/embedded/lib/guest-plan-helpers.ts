import type { DBPlanDay, DBSession } from '@/types'
import {
  guestCompletionsMap,
  type GuestPlannerBundle,
} from '@/lib/guest-planner-store'

export function sessionsWithGuestCompletions(
  bundle: GuestPlannerBundle,
  sessions: DBSession[],
): (DBSession & {
  completed: boolean
  completed_minutes: number | null
  perceived_effort: number | null
})[] {
  const map = guestCompletionsMap(bundle)
  return sessions.map((s) => {
    const c = map.get(s.id)
    return {
      ...s,
      completed: map.has(s.id),
      completed_minutes: c?.minutes ?? null,
      perceived_effort: c?.perceived ?? null,
    }
  })
}

export function planDayForDate(
  bundle: GuestPlannerBundle,
  dayDate: string,
): DBPlanDay | null {
  return bundle.planDays.find((d) => d.day_date === dayDate) ?? null
}

export function guestWeeklyCompletionPercent(
  bundle: GuestPlannerBundle,
  weekStart: string,
  weekEnd: string,
): number {
  const weekSessions = bundle.sessions.filter(
    (s) =>
      s.day_date >= weekStart &&
      s.day_date <= weekEnd &&
      s.session_type !== 'rest',
  )
  if (weekSessions.length === 0) return 0
  const map = guestCompletionsMap(bundle)
  const done = weekSessions.filter((s) => map.has(s.id)).length
  return Math.round((done / weekSessions.length) * 100)
}

export function guestStreak(bundle: GuestPlannerBundle): number {
  const datesWithActivity = new Set<string>()
  const map = guestCompletionsMap(bundle)
  for (const s of bundle.sessions) {
    if (map.has(s.id)) datesWithActivity.add(s.day_date)
  }
  let streak = 0
  const checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)
  for (let i = 0; i < 60; i++) {
    const iso = checkDate.toISOString().slice(0, 10)
    if (datesWithActivity.has(iso)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
