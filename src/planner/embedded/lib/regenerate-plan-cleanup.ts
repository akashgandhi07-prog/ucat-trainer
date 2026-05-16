import type { DBPlanDay, DBPlanWeek, DBSession } from '@/types'
import { addDays, parseDate, toISODate } from '@/lib/utils'

type PlanWeekRow = Pick<DBPlanWeek, 'id' | 'week_number' | 'week_start' | 'is_locked'>

const DELETE_CHUNK = 80

export function datesForDbWeek(weekStart: string): string[] {
  const start = parseDate(weekStart)
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)))
}

export function anchorDateForRegenerate(weeks: PlanWeekRow[], fromWeekNumber: number): string {
  const anchor = weeks.find((w) => w.week_number === fromWeekNumber)
  if (anchor) return anchor.week_start
  const fallback = weeks.find((w) => w.week_number >= fromWeekNumber && !w.is_locked)
  if (!fallback) throw new Error('Could not find a week to rebuild from')
  return fallback.week_start
}

function isDateInLockedDbWeek(
  dayDate: string,
  weeks: PlanWeekRow[],
  lockedWeekNumbers: Set<number>,
): boolean {
  for (const w of weeks) {
    if (!lockedWeekNumbers.has(w.week_number)) continue
    if (datesForDbWeek(w.week_start).includes(dayDate)) return true
  }
  return false
}

/** Calendar dates for unlocked DB weeks being replaced (includes orphan days after week row delete). */
export function collectDatesToClearBeforeRegenerate(
  weeks: PlanWeekRow[],
  fromWeekNumber: number,
): Set<string> {
  const dates = new Set<string>()
  for (const w of weeks) {
    if (w.week_number < fromWeekNumber || w.is_locked) continue
    for (const d of datesForDbWeek(w.week_start)) dates.add(d)
  }
  return dates
}

type WeekInsert = Omit<DBPlanWeek, 'created_at' | 'updated_at'>
type DayInsert = Omit<DBPlanDay, 'created_at' | 'updated_at'>
type SessionInsert = Omit<DBSession, 'created_at' | 'updated_at'>

/**
 * Generated plans always number weeks from "this Monday", which diverges from stored
 * plan_weeks. Filter and re-number by calendar date from the anchor week in the DB.
 */
export function prepareRegeneratedRows(
  weeks: PlanWeekRow[],
  fromWeekNumber: number,
  fromDateIso: string,
  newWeeks: WeekInsert[],
  newDays: DayInsert[],
  newSessions: SessionInsert[],
): {
  datesToClear: string[]
  futureNewWeeks: WeekInsert[]
  futureNewDays: DayInsert[]
  futureNewSessions: SessionInsert[]
  futureWeekRowIds: string[]
} {
  const lockedWeekNumbers = new Set(weeks.filter((w) => w.is_locked).map((w) => w.week_number))

  const eligibleWeeks = newWeeks
    .filter((w) => w.week_start >= fromDateIso)
    .sort((a, b) => a.week_start.localeCompare(b.week_start))

  let nextWeekNumber = fromWeekNumber
  const futureNewWeeks = eligibleWeeks.map((w) => ({
    ...w,
    week_number: nextWeekNumber++,
  }))
  const futureWeekIds = new Set(futureNewWeeks.map((w) => w.id))

  const futureNewDays = newDays.filter(
    (d) =>
      futureWeekIds.has(d.plan_week_id) &&
      d.day_date >= fromDateIso &&
      !isDateInLockedDbWeek(d.day_date, weeks, lockedWeekNumbers),
  )
  const futureDayIds = new Set(futureNewDays.map((d) => d.id))
  const futureNewSessions = newSessions.filter((s) => futureDayIds.has(s.plan_day_id))

  const datesToClear = collectDatesToClearBeforeRegenerate(weeks, fromWeekNumber)
  for (const d of futureNewDays) datesToClear.add(d.day_date)

  const futureWeekRowIds = weeks
    .filter((w) => w.week_number >= fromWeekNumber && !w.is_locked)
    .map((w) => w.id)

  return {
    datesToClear: [...datesToClear],
    futureNewWeeks,
    futureNewDays,
    futureNewSessions,
    futureWeekRowIds,
  }
}

export async function deletePlanTimetableByDates(
  sb: {
    from: (table: string) => {
      delete: () => {
        eq: (col: string, val: string) => {
          in: (col: string, vals: string[]) => Promise<{ error: { message: string } | null }>
        }
      }
    }
  },
  planId: string,
  timetableTable: string,
  dates: string[],
): Promise<void> {
  for (let i = 0; i < dates.length; i += DELETE_CHUNK) {
    const chunk = dates.slice(i, i + DELETE_CHUNK)
    const { error } = await sb
      .from(timetableTable)
      .delete()
      .eq('plan_id', planId)
      .in('day_date', chunk)
    if (error) throw new Error(error.message)
  }
}

export async function deletePlanDaysByDates(
  sb: {
    from: (table: string) => {
      delete: () => {
        eq: (col: string, val: string) => {
          in: (col: string, vals: string[]) => Promise<{ error: { message: string } | null }>
        }
      }
    }
  },
  planId: string,
  dates: string[],
): Promise<void> {
  for (let i = 0; i < dates.length; i += DELETE_CHUNK) {
    const chunk = dates.slice(i, i + DELETE_CHUNK)
    const { error } = await sb.from('plan_days').delete().eq('plan_id', planId).in('day_date', chunk)
    if (error) throw new Error(error.message)
  }
}
