/** Guardrails when students raise study targets; burnout protection */

export const STUDY_LOAD_GUARDS = {
  /** Max weekday hours increase vs previous plan snapshot in one rebalance */
  maxWeekdayHourJumpPerRegen: 2,
  maxWeekendHourJumpPerRegen: 3,
  /** Gentle nudge threshold (warnings only, not capped in engine) */
  softWeekdayHoursCeiling: 8,
  softWeekendHoursCeiling: 10,
}

export function clampPlannerHourBump(
  previous: number,
  requestedRaw: number,
  maxJump: number,
): { value: number; wasCapped: boolean } {
  const requested = Math.round(requestedRaw * 2) / 2
  const maxAllowed = Math.round((previous + maxJump) * 2) / 2
  if (requested <= maxAllowed) return { value: requested, wasCapped: false }
  return { value: maxAllowed, wasCapped: true }
}

export function overloadWarnings(nextSchool: number, nextWeekend: number): string[] {
  const w: string[] = []
  if (nextSchool >= STUDY_LOAD_GUARDS.softWeekdayHoursCeiling) {
    w.push(
      `${nextSchool}h on typical weekdays is a heavy load; consider one full rest day and watch sleep.`,
    )
  }
  if (nextWeekend >= STUDY_LOAD_GUARDS.softWeekendHoursCeiling) {
    w.push(
      `${nextWeekend}h on weekend-style days stacks up quickly; rebuild again if fatigue builds.`,
    )
  }
  return w
}
