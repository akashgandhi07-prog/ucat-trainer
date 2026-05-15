import { addDays, parseDate } from '@/lib/utils'

/** Calendar week row must include `week_number` and `week_start` (ISO date). */
export function weekNumberForCalendarDate(
  weeks: { week_number: number; week_start: string }[],
  dayDate: string,
): number | null {
  const target = parseDate(dayDate)
  target.setHours(0, 0, 0, 0)
  for (const w of weeks) {
    const start = parseDate(w.week_start)
    start.setHours(0, 0, 0, 0)
    const end = addDays(start, 6)
    end.setHours(0, 0, 0, 0)
    if (target >= start && target <= end) return w.week_number
  }
  return null
}
