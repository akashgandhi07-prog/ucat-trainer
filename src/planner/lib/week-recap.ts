/**
 * Pure helpers for the reflect view's past-week recap line
 * ("Planned Xh · Logged Yh · Avg effort Z/5").
 */

export interface WeekRecapWeek {
  week_number: number
  week_start: string // ISO YYYY-MM-DD (Monday)
}

export interface WeekRecapSessionRow {
  id: string
  day_date: string
  duration_minutes: number
  session_type: string
}

export interface WeekRecapCompletionRow {
  session_id: string
  minutes_completed: number | null
  perceived_effort: number | null
}

export interface WeekRecap {
  plannedMinutes: number
  loggedMinutes: number
  /** Mean perceived effort (1-5), one decimal place; null when nothing rated. */
  avgEffort: number | null
}

/** Add days to an ISO date without timezone drift. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** A week is fully in the past once its last day (week_start + 6) is before today. */
export function isWeekCompleted(weekStart: string, todayIso: string): boolean {
  return addDaysIso(weekStart, 6) < todayIso
}

/**
 * Bucket plan sessions and completions into per-week recap stats.
 * Rest sessions are excluded from planned minutes (and cannot be completed).
 */
export function bucketWeekRecaps(
  weeks: WeekRecapWeek[],
  sessions: WeekRecapSessionRow[],
  completions: WeekRecapCompletionRow[],
): Map<number, WeekRecap> {
  const ranges = weeks.map(w => ({
    weekNumber: w.week_number,
    start: w.week_start,
    end: addDaysIso(w.week_start, 6),
  }))

  function weekFor(dayDate: string): number | null {
    for (const r of ranges) {
      if (dayDate >= r.start && dayDate <= r.end) return r.weekNumber
    }
    return null
  }

  const acc = new Map<
    number,
    { plannedMinutes: number; loggedMinutes: number; effortSum: number; effortCount: number }
  >()
  for (const w of weeks) {
    acc.set(w.week_number, { plannedMinutes: 0, loggedMinutes: 0, effortSum: 0, effortCount: 0 })
  }

  const sessionById = new Map(sessions.map(s => [s.id, s]))

  for (const s of sessions) {
    if (s.session_type === 'rest') continue
    const wk = weekFor(s.day_date)
    if (wk == null) continue
    const bucket = acc.get(wk)
    if (!bucket) continue
    bucket.plannedMinutes += s.duration_minutes
  }

  for (const c of completions) {
    const s = sessionById.get(c.session_id)
    if (!s || s.session_type === 'rest') continue
    const wk = weekFor(s.day_date)
    if (wk == null) continue
    const bucket = acc.get(wk)
    if (!bucket) continue
    bucket.loggedMinutes += Math.max(0, c.minutes_completed ?? 0)
    if (c.perceived_effort != null) {
      bucket.effortSum += c.perceived_effort
      bucket.effortCount += 1
    }
  }

  const out = new Map<number, WeekRecap>()
  for (const [weekNumber, b] of acc) {
    out.set(weekNumber, {
      plannedMinutes: b.plannedMinutes,
      loggedMinutes: b.loggedMinutes,
      avgEffort: b.effortCount > 0 ? Math.round((b.effortSum / b.effortCount) * 10) / 10 : null,
    })
  }
  return out
}
