/**
 * Official UCAT sitting window used in app pickers (inclusive ISO dates).
 * Update yearly when Pearson publishes dates.
 */
export const UCAT_EXAM_WINDOW_START_ISO = "2026-07-13";
export const UCAT_EXAM_WINDOW_END_ISO = "2026-09-24";
export const UCAT_EXAM_YEAR = 2026;


const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normaliseExamDateIso(s: string): string | null {
  const head = s.trim().slice(0, 10);
  const m = ISO_DATE.exec(head);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function isWithinUcatExamWindow(isoYYYYMMDD: string): boolean {
  const d = normaliseExamDateIso(isoYYYYMMDD);
  if (!d) return false;
  return d >= UCAT_EXAM_WINDOW_START_ISO && d <= UCAT_EXAM_WINDOW_END_ISO;
}

/** Use when hydrating legacy profile dates that sit outside the current published window. */
export function clampToUcatExamWindow(isoYYYYMMDD: string): string {
  const d = normaliseExamDateIso(isoYYYYMMDD);
  if (!d) return UCAT_EXAM_WINDOW_START_ISO;
  if (d < UCAT_EXAM_WINDOW_START_ISO) return UCAT_EXAM_WINDOW_START_ISO;
  if (d > UCAT_EXAM_WINDOW_END_ISO) return UCAT_EXAM_WINDOW_END_ISO;
  return d;
}

/** Valid sitting days for a month inside the published window (month 7 to 9). */
export function ucatExamDayRangeInMonth(monthOneIndexed: number): { minDay: number; maxDay: number } | null {
  if (monthOneIndexed === 7) return { minDay: 13, maxDay: 31 };
  if (monthOneIndexed === 8) return { minDay: 1, maxDay: 31 };
  if (monthOneIndexed === 9) return { minDay: 1, maxDay: 24 };
  return null;
}
