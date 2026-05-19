/**
 * UCAT Plan Generation Engine
 *
 * Generates structured weekly session plans from student inputs.
 * Pure functions: no Supabase calls here; the caller saves to DB.
 */

import {
  DBPlanWeek, DBPlanDay, DBSession,
  Phase, SectionWeight, SessionType, WeekType, DifficultyRating, DateRange, UCATSection
} from '@/types'
import { addDays, toISODate, parseDate, weeksUntil, startOfWeek } from './utils'
import {
  weaknessTagWeightBonus,
  weaknessHints,
  weakestSectionFromScores,
  type WeaknessSection,
} from './mock-weaknesses'

const SESSION_LABEL_SHORT: Record<'vr' | 'dm' | 'qr' | 'sjt', string> = {
  vr: 'Verbal reasoning',
  dm: 'Decision making',
  qr: 'Quantitative reasoning',
  sjt: 'Situational judgement',
}

const MINI_MOCK_LABEL: Record<UCATSection, string> = {
  vr: 'Mini VR Mock',
  dm: 'Mini DM Mock',
  qr: 'Mini QR Mock',
  sjt: 'Mini SJT Mock',
}

export interface PlannerRationaleContext {
  phase: Phase
  weaknessHintsList: string[]
  mockWeakestMain: WeaknessSection | null
}

function rationaleForSession(
  sessionType: SessionType,
  ctx: PlannerRationaleContext,
  previousSession: SessionType | null,
  miniMockFocus?: UCATSection,
): string | null {
  if (sessionType === 'rest') return null

  const wh = ctx.weaknessHintsList

  const tagLine =
    wh.length > 0
      ? `This block lines up with your logged focus (${wh.slice(0, 2).join('; ')}).`
      : null

  if (sessionType === 'reflection') {
    if (previousSession === 'full_mock') {
      return 'Two-hour review after your full mock: debrief errors, timing, and what to drill next.'
    }
    if (previousSession === 'mini_mock') {
      return 'Short review after the mini mock: score it, spot the timing issue, and choose the next drill.'
    }
    return 'Brief review slot to consolidate what you just practised.'
  }
  if (sessionType === 'full_mock') {
    return ctx.phase === 'final_week'
      ? 'Full mock rehearsal while you approach exam week.'
      : 'Timed mock to track stamina and pacing under pressure.'
  }
  if (sessionType === 'mini_mock') {
    const focus = miniMockFocus ? `${SESSION_LABEL_SHORT[miniMockFocus]} ` : ''
    const base = `${focus}mini mock: a short timed checkpoint before full mocks take over.`
    return tagLine ? `${base} ${tagLine}` : base
  }

  const sec = practiceWeaknessBucket(sessionType)
  if (!sec) return 'Planned skill block to keep momentum across sections.'

  const secName = SESSION_LABEL_SHORT[sec]

  if (ctx.mockWeakestMain === sec) {
    const base =
      `${secName} is scheduled because it trailed your other numbered sections on the latest mock.`
    return tagLine ? `${base} ${tagLine}` : base
  }

  const matchesTagged =
    (sec === 'vr' && wh.some(h => /^VR\b/i.test(h))) ||
    (sec === 'dm' && wh.some(h => /^DM\b/i.test(h))) ||
    (sec === 'qr' && wh.some(h => /^QR\b/i.test(h))) ||
    (sec === 'sjt' && wh.some(h => /^SJT\b/i.test(h)))

  if (matchesTagged) {
    return tagLine ?? `Extra ${secName} practice while you tighten that area from your mock notes.`
  }

  const balance = `Keeps ${secName} ticking over alongside your other UCAT papers.`
  return tagLine ? `${balance} ${tagLine}` : balance
}

function practiceWeaknessBucket(st: SessionType): WeaknessSection | null {
  if (st === 'vr_practice') return 'vr'
  if (st === 'dm_practice') return 'dm'
  if (st === 'qr_practice') return 'qr'
  if (st === 'sjt_practice') return 'sjt'
  return null
}

// ─── Phase determination ──────────────────────────────────────────────────────

export function getPhase(weeksUntilExam: number, hasPriorExperience: boolean): Phase {
  // Final 3 weeks: maximum intensity, 4 full mocks/week, ~6h/day
  if (weeksUntilExam <= 3) return 'final_week'
  // Weeks 4-6 out: 3 full mocks/week
  if (weeksUntilExam <= 6) return 'full_mock'
  // Weeks 7-10 out: frequent section mini mocks before full mocks take over
  if (weeksUntilExam <= 10) return 'mini_mock'
  // Earlier: timed section practice (experienced) or untimed foundations (beginners)
  return hasPriorExperience ? 'timed' : 'foundations'
}

// ─── Section weighting ────────────────────────────────────────────────────────

export function calcSectionWeights(
  confidence: { vr: number; dm: number; qr: number; sjt: number },
  mockScores?: { vr: number | null; dm: number | null; qr: number | null } | null,
  tagWeights?: { vr: number; dm: number; qr: number; sjt: number } | null,
): SectionWeight {
  let vr = 6 - confidence.vr + (tagWeights?.vr ?? 0)
  let dm = 6 - confidence.dm + (tagWeights?.dm ?? 0)
  let qr = 6 - confidence.qr + (tagWeights?.qr ?? 0)

  if (mockScores && (mockScores.vr || mockScores.dm || mockScores.qr)) {
    const scores = [mockScores.vr, mockScores.dm, mockScores.qr].filter(Boolean) as number[]
    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const deltas = {
        vr: mockScores.vr ? avg - mockScores.vr : 0,
        dm: mockScores.dm ? avg - mockScores.dm : 0,
        qr: mockScores.qr ? avg - mockScores.qr : 0,
      }
      const maxDelta = Math.max(deltas.vr, deltas.dm, deltas.qr)
      if (maxDelta > 0) {
        if (deltas.vr === maxDelta) vr += 2
        else if (deltas.dm === maxDelta) dm += 2
        else qr += 2
      }
    }
  }

  const mainSum = vr + dm + qr
  const sjt = (mainSum / 3) * 0.6
  const total = vr + dm + qr + sjt
  return { vr: vr / total, dm: dm / total, qr: qr / total, sjt: sjt / total }
}

// ─── Per-day hours ────────────────────────────────────────────────────────────

/**
 * Ramp factor: 50% of max in week 1, linearly increasing to 100% by the final weeks.
 * Short plans (≤3 weeks) always run at full intensity.
 */
function rampFactor(weekNumber: number, totalWeeks: number): number {
  if (totalWeeks <= 3) return 1.0
  const progress = (weekNumber - 1) / Math.max(totalWeeks - 1, 1)
  return Math.min(0.5 + 0.5 * progress, 1.0)
}

function calendarDaysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / 86400000)
}

function roundPlannerHours(h: number): number {
  return Math.max(Math.round(h * 2) / 2, 0.5)
}

/**
 * Target timed mock sessions per week, scaled by both phase and available hours.
 *
 * The key insight: a student doing 6h/day can fit 5-6 mocks/week in the final
 * weeks; a student doing 3h/day can fit fewer. Rather than hard-coding a fixed
 * count, we compute how many mock+reflection blocks physically fit in the week's
 * available time, then apply a generous phase ceiling so mocks can't run away in
 * early weeks even if hours are high.
 *
 * Phase ceilings (upper bounds - time is the real constraint):
 *   ≤3 weeks out  → full mocks ramp 4 → 5 → 6/wk, time permitting
 *   ≤6 weeks out  → full mocks ramp 2 → 3 → 4/wk
 *   earlier       → frequent 20-30 minute mini mocks, usually 4-5/wk
 */
export function weeklyMockTarget(
  weeksRemaining: number,
  totalWeeks: number,
  weeklyAvailableMinutes: number,
  ucatSen: boolean,
): number {
  if (weeksRemaining <= 0) return 0

  const fullBlock = (ucatSen ? 150 : 120) + 120   // full mock + 2h reflection
  const miniBlock = 25 + 30                         // mini mock + short review

  // Use the block size appropriate for the phase
  const blockSize = weeksRemaining <= 6 ? fullBlock : miniBlock

  // How many mock sessions can physically fit in the available weekly time?
  // Cap at 6 so there's always at least one guaranteed rest/pure-practice day.
  const fitsByTime = Math.min(6, Math.floor(weeklyAvailableMinutes / blockSize))

  // Generous phase ceilings - time is the binding constraint for high-hours students;
  // these ceilings only matter for very-low-hours students where fitsByTime exceeds
  // what makes educational sense for that phase.
  let phaseCeiling: number
  if (weeksRemaining <= 1) phaseCeiling = 6
  else if (weeksRemaining <= 2) phaseCeiling = 5
  else if (weeksRemaining <= 3) phaseCeiling = 4
  else if (weeksRemaining <= 4) phaseCeiling = 4
  else if (weeksRemaining <= 5) phaseCeiling = 3
  else if (weeksRemaining <= 6) phaseCeiling = 2
  else phaseCeiling = 5

  let ideal = Math.min(phaseCeiling, fitsByTime)

  // Very compressed plans still ramp, but they need to skip some stepping stones.
  if (totalWeeks <= 6 && weeksRemaining <= 6) {
    const compressedCeiling =
      weeksRemaining <= 1 ? 5 :
      weeksRemaining <= 2 ? 3 :
      1
    ideal = Math.min(ideal, compressedCeiling)
  }

  return ideal
}

/**
 * Returns study hours for a given date.
 *  - Term weekdays (Mon-Fri, not in holiday_periods): school-day target scaled by ramp
 *    (50% in week 1 of the plan through full intensity by the end, for long plans).
 *  - Weekend days and any date inside holiday_periods: at least 3h once past exam day;
 *    a gradual increase from 3h toward 4h across the plan, then 4h through 6h per day
 *    in the final 14 days before the exam (UCAT holiday-style study build-up).
 */
export function hoursForDate(
  date: Date,
  examDate: Date,
  planStart: Date,
  schoolDayMax: number,
  weekendMax: number,
  holidayPeriods: DateRange[],
  weekNumber: number,
  totalWeeks: number,
): number {
  const ds = toISODate(date)
  if (ds === toISODate(examDate)) return 0

  const daysUntilExam = calendarDaysBetween(date, examDate)

  const dow = date.getDay()
  const isWeekend = dow === 0 || dow === 6
  const isHoliday = holidayPeriods.some((h) => ds >= h.start && ds <= h.end)
  const isHighCapacity = isWeekend || isHoliday

  /**
   * Final three weeks (21-day window before the exam, excluding exam day): ramp every day
   * from the student's current weekday baseline toward 6 h/day. We deliberately push past
   * the student's stated weekend max - the exam is near and intensity must rise. A student
   * who said "4 h weekends" will see the plan climb to 6 h here so the mock count is
   * achievable (each full mock + reflection block needs ~4 h).
   */
  if (daysUntilExam >= 1 && daysUntilExam <= 21) {
    const low = isHighCapacity
      ? Math.max(3, weekendMax, schoolDayMax)
      : Math.max(2, schoolDayMax)
    // Always ramp toward at least 6 h, even if the student's stated max is lower
    const high = Math.max(6, weekendMax, schoolDayMax)
    const t = (21 - daysUntilExam) / 20
    return roundPlannerHours(low + t * (high - low))
  }

  if (!isHighCapacity) {
    const ramped = schoolDayMax * rampFactor(weekNumber, totalWeeks)
    return roundPlannerHours(ramped)
  }

  const finalPhaseStart = addDays(examDate, -14)
  const lastPrePhaseDay = addDays(finalPhaseStart, -1)
  const prePhaseCeiling = Math.max(3, Math.min(weekendMax, 4))
  const dayNumFromStart = calendarDaysBetween(planStart, date)
  const denom = Math.max(1, calendarDaysBetween(planStart, lastPrePhaseDay))
  const progress = Math.min(1, Math.max(0, dayNumFromStart / denom))
  const h = 3 + progress * (prePhaseCeiling - 3)
  return roundPlannerHours(h)
}

/**
 * Determine week_type for display: 'holiday' if most weekdays in that week
 * fall inside a holiday period, else 'school'.
 */
function weekTypeForWeek(weekStart: Date, holidayPeriods: DateRange[]): WeekType {
  let holidayDays = 0
  for (let i = 1; i <= 5; i++) {   // Mon-Fri
    const d = addDays(weekStart, i)
    const ds = toISODate(d)
    if (holidayPeriods.some(h => ds >= h.start && ds <= h.end)) holidayDays++
  }
  return holidayDays >= 3 ? 'holiday' : 'school'
}

// ─── Session duration in minutes ─────────────────────────────────────────────

const SESSION_DURATIONS: Record<SessionType, number> = {
  vr_practice:  45,
  dm_practice:  45,
  qr_practice:  45,
  sjt_practice: 30,
  mini_mock:    25,
  full_mock:   120,
  reflection:   45,
  rest:          0,
}

/** Review after a full timed mock: score, debrief sections, plan next steps */
const REFLECTION_AFTER_MOCK_MIN = 120
/** Quick review after a section mini mock */
const REFLECTION_AFTER_MINI_MOCK_MIN = 30
/** Short consolidation after a practice stack on the same day */
const REFLECTION_AFTER_PRACTICE_MIN = 45

function fullMockMinutes(ucatSen: boolean): number {
  return ucatSen ? 150 : 120
}

function plannedSessionDurationMinutes(
  sessionType: SessionType,
  ucatSen: boolean,
  previousType: SessionType | null,
): number {
  if (sessionType === 'full_mock') return fullMockMinutes(ucatSen)
  if (sessionType === 'reflection') {
    return previousType === 'full_mock'
      ? REFLECTION_AFTER_MOCK_MIN
      : previousType === 'mini_mock'
        ? REFLECTION_AFTER_MINI_MOCK_MIN
      : REFLECTION_AFTER_PRACTICE_MIN
  }
  return SESSION_DURATIONS[sessionType]
}

// ─── Section spacing tracker ──────────────────────────────────────────────────

export interface SectionTracker {
  vr: number   // global day index when last practiced (-10 = never)
  dm: number
  qr: number
}

function allowedGap(section: keyof SectionTracker, confidence: { vr: number; dm: number; qr: number; sjt: number }): number {
  return confidence[section] >= 4 ? 2 : 1
}

function urgencyBoost(
  section: keyof SectionTracker,
  tracker: SectionTracker,
  currentDayIndex: number,
  confidence: { vr: number; dm: number; qr: number; sjt: number }
): number {
  const emptyDays = currentDayIndex - tracker[section] - 1
  const maxGap = allowedGap(section, confidence)
  if (emptyDays > maxGap) return 8
  if (emptyDays === maxGap) return 3
  return 0
}

// ─── Session planning ─────────────────────────────────────────────────────────

function weakestPracticeSection(weights: SectionWeight): SessionType {
  return (([
    { type: 'vr_practice' as SessionType, weight: weights.vr },
    { type: 'dm_practice' as SessionType, weight: weights.dm },
    { type: 'qr_practice' as SessionType, weight: weights.qr },
  ]).sort((a, b) => b.weight - a.weight))[0].type
}

type PlannedSession = {
  type: SessionType
  miniMockFocus?: UCATSection
}

function rankedMiniMockFocuses(weights: SectionWeight): UCATSection[] {
  return ([
    { section: 'vr' as UCATSection, weight: weights.vr },
    { section: 'dm' as UCATSection, weight: weights.dm },
    { section: 'qr' as UCATSection, weight: weights.qr },
    { section: 'sjt' as UCATSection, weight: weights.sjt },
  ]).sort((a, b) => b.weight - a.weight).map(row => row.section)
}

function miniMockFocusForSlot(weights: SectionWeight, slot: number): UCATSection {
  const ranked = rankedMiniMockFocuses(weights)
  const focusCycle: UCATSection[] = [
    ranked[0],
    ranked[1] ?? ranked[0],
    ranked[0],
    ranked[2] ?? ranked[0],
    ranked[0],
    ranked[3] ?? ranked[0],
  ]
  return focusCycle[slot % focusCycle.length]
}

function miniMockNote(focus?: UCATSection): string | null {
  return focus ? MINI_MOCK_LABEL[focus] : null
}

export function planDaySessions(
  availableMinutes: number,
  phase: Phase,
  weights: SectionWeight,
  weekMockCount: number,
  weeklyMockCap: number,
  _isFinalWeek: boolean,
  _dayOfWeek: number,
  isExamDay: boolean,
  tracker: SectionTracker,
  currentDayIndex: number,
  confidence: { vr: number; dm: number; qr: number; sjt: number },
  ucatSen: boolean,
  /** Calendar days until the exam (1 = day before). */
  _daysUntilExamCal: number,
  /** Whole-weeks until exam from this week's Monday (same basis as {@link getPhase}). */
  _weeksRemainingForWeek: number,
): { sessions: PlannedSession[] } {
  if (isExamDay) return { sessions: [] }

  const sessions: PlannedSession[] = []
  let remaining = availableMinutes
  const fullMock = fullMockMinutes(ucatSen)
  const fullMockBlock = fullMock + REFLECTION_AFTER_MOCK_MIN
  const miniBlock = SESSION_DURATIONS.mini_mock + REFLECTION_AFTER_MINI_MOCK_MIN

  // ── Final 3 weeks: 4 full mocks/week ────────────────────────────────────────
  if (phase === 'final_week') {
    if (weekMockCount < weeklyMockCap && remaining >= fullMockBlock) {
      sessions.push({ type: 'full_mock' })
      remaining -= fullMock
      sessions.push({ type: 'reflection' })
      remaining -= REFLECTION_AFTER_MOCK_MIN
      // Use any leftover time for targeted practice
      const weak = weakestPracticeSection(weights)
      if (remaining >= SESSION_DURATIONS[weak]) sessions.push({ type: weak })
      return { sessions }
    }
    // Non-mock days: high-intensity timed practice
    return planPracticeSessions(remaining, weights, true, tracker, currentDayIndex, confidence)
  }

  // ── Weeks 4-6 out: 3 full mocks/week ────────────────────────────────────────
  if (phase === 'full_mock') {
    if (weekMockCount < weeklyMockCap && remaining >= fullMockBlock) {
      sessions.push({ type: 'full_mock' })
      remaining -= fullMock
      sessions.push({ type: 'reflection' })
      remaining -= REFLECTION_AFTER_MOCK_MIN
      const weak = weakestPracticeSection(weights)
      if (remaining >= SESSION_DURATIONS[weak]) sessions.push({ type: weak })
      return { sessions }
    }
    return planPracticeSessions(remaining, weights, true, tracker, currentDayIndex, confidence)
  }

  // ── Weeks 7-10 out: frequent section mini mocks ─────────────────────────────
  if (phase === 'mini_mock') {
    if (weekMockCount < weeklyMockCap) {
      if (remaining >= miniBlock) {
        sessions.push({ type: 'mini_mock', miniMockFocus: miniMockFocusForSlot(weights, weekMockCount) })
        remaining -= SESSION_DURATIONS.mini_mock
        sessions.push({ type: 'reflection' })
        remaining -= REFLECTION_AFTER_MINI_MOCK_MIN
        const weak = weakestPracticeSection(weights)
        if (remaining >= SESSION_DURATIONS[weak]) sessions.push({ type: weak })
        return { sessions }
      }
    }
    return planPracticeSessions(remaining, weights, true, tracker, currentDayIndex, confidence)
  }

  // ── Timed / foundations: frequent 25-minute mini mocks once foundations start.
  if (weekMockCount < weeklyMockCap && remaining >= miniBlock) {
    sessions.push({ type: 'mini_mock', miniMockFocus: miniMockFocusForSlot(weights, weekMockCount) })
    remaining -= SESSION_DURATIONS.mini_mock
    sessions.push({ type: 'reflection' })
    remaining -= REFLECTION_AFTER_MINI_MOCK_MIN
    const weak = weakestPracticeSection(weights)
    if (remaining >= SESSION_DURATIONS[weak]) sessions.push({ type: weak })
    return { sessions }
  }

  return planPracticeSessions(remaining, weights, phase === 'timed', tracker, currentDayIndex, confidence)
}

function planPracticeSessions(
  availableMinutes: number,
  weights: SectionWeight,
  isTimed: boolean,
  tracker: SectionTracker,
  currentDayIndex: number,
  confidence: { vr: number; dm: number; qr: number; sjt: number },
): { sessions: PlannedSession[] } {
  const sessions: PlannedSession[] = []
  let remaining = availableMinutes

  const ranked = ([
    { type: 'vr_practice' as SessionType, weight: weights.vr + urgencyBoost('vr', tracker, currentDayIndex, confidence) },
    { type: 'dm_practice' as SessionType, weight: weights.dm + urgencyBoost('dm', tracker, currentDayIndex, confidence) },
    { type: 'qr_practice' as SessionType, weight: weights.qr + urgencyBoost('qr', tracker, currentDayIndex, confidence) },
    { type: 'sjt_practice' as SessionType, weight: weights.sjt },
  ]).sort((a, b) => b.weight - a.weight)

  let added = 0
  for (const { type } of ranked) {
    const dur = SESSION_DURATIONS[type]
    if (remaining >= dur) { sessions.push({ type }); remaining -= dur; added++ }
    if (added >= 3) break
  }

  if (remaining >= REFLECTION_AFTER_PRACTICE_MIN && sessions.length >= 2) {
    sessions.push({ type: 'reflection' })
  }

  return { sessions }
}

// ─── Full plan generator ──────────────────────────────────────────────────────

export interface PlanInputs {
  planId: string
  examDate: Date
  hasPriorExperience: boolean
  confidence: { vr: number; dm: number; qr: number; sjt: number }
  // Schedule
  schoolDayHours: number
  weekendHours: number
  holidayPeriods: DateRange[]
  restDays: number[]
  busyPeriods: DateRange[]       // fully unavailable date ranges
  /** UCATSEN: full mocks allocate 2h30 instead of standard 2h */
  ucatSen?: boolean
  // Regeneration
  difficultyAdjustment?: number
  latestMockScores?: { vr: number | null; dm: number | null; qr: number | null } | null
  /** Learner-checked weakness tags from latest mock row */
  weaknessTags?: string[] | null
  regenerateFromWeek?: number
}

interface WeekPlan {
  weekNumber: number
  weekStart: Date
  weekType: WeekType
  defaultHours: number   // representative hours for the week (school day hours)
  days: {
    date: Date
    isRest: boolean
    availableMinutes: number
    sessions: { type: SessionType; rationale: string | null; miniMockFocus?: UCATSection }[]
  }[]
}

export interface GeneratedPlan {
  weeks: WeekPlan[]
}

export function generateFullPlan(inputs: PlanInputs): GeneratedPlan {
  const {
    examDate, hasPriorExperience, confidence,
    schoolDayHours, weekendHours, holidayPeriods,
    restDays, busyPeriods, latestMockScores, weaknessTags,
    ucatSen = false,
  } = inputs

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const planStart = startOfWeek(today, 1)   // Monday

  const busyDates = new Set<string>()
  for (const p of busyPeriods) {
    const s = parseDate(p.start)
    const e = parseDate(p.end)
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      busyDates.add(toISODate(new Date(d)))
    }
  }

  const examDateStr = toISODate(examDate)

  const tagBonus = weaknessTagWeightBonus(weaknessTags ?? [])
  const totalWeeks = Math.ceil(weeksUntil(examDate, planStart) + 1)
  const weights = calcSectionWeights(confidence, latestMockScores, tagBonus)

  const mockWeakestMain = weakestSectionFromScores(latestMockScores ?? null)

  const baseRationaleCtx: Omit<PlannerRationaleContext, 'phase'> = {
    weaknessHintsList: weaknessHints(weaknessTags ?? []),
    mockWeakestMain,
  }

  const tracker: SectionTracker = { vr: -10, dm: -10, qr: -10 }
  let globalDayIndex = 0
  const weeks: WeekPlan[] = []

  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = addDays(planStart, w * 7)
    if (weekStart > examDate) break

    const weeksRemaining = weeksUntil(examDate, weekStart)
    const phase = getPhase(weeksRemaining, hasPriorExperience)
    const weekType = weekTypeForWeek(weekStart, holidayPeriods)

    const days: WeekPlan['days'] = []
    let weekMockCount = 0

    const rationaleCtx: PlannerRationaleContext = { ...baseRationaleCtx, phase }

    // Pre-compute total available study minutes for this week so we can size the mock
    // count to what the student can actually fit given their hours.
    let weeklyAvailableMinutes = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      if (d > examDate) break
      const ds = toISODate(d)
      if (restDays.includes(d.getDay()) || busyDates.has(ds)) continue
      const h = hoursForDate(d, examDate, planStart, schoolDayHours, weekendHours, holidayPeriods, w + 1, totalWeeks)
      weeklyAvailableMinutes += Math.round(h * 60)
    }

    const weeklyMockCap = weeklyMockTarget(weeksRemaining, totalWeeks, weeklyAvailableMinutes, ucatSen)
    // First two weeks for true beginners: pure untimed foundations, no mocks at all.
    // Once they've built some confidence (week 3+), frequent section mini mocks begin.
    const effectiveMockCap = (phase === 'foundations' && w < 2) ? 0 : weeklyMockCap

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i)
      if (date > examDate) break

      const dateStr = toISODate(date)
      const dow = date.getDay()
      const isRestDay = restDays.includes(dow)
      const isBusy = busyDates.has(dateStr)
      const isRest = isRestDay || isBusy
      const isExamDay = dateStr === examDateStr
      const isFinalWeek = weeksUntil(examDate, date) <= 1
      const daysUntilExamCal = calendarDaysBetween(date, examDate)

      const hours = hoursForDate(
        date,
        examDate,
        planStart,
        schoolDayHours,
        weekendHours,
        holidayPeriods,
        w + 1,
        totalWeeks,
      )
      const availableMinutes = isRest ? 0 : Math.round(hours * 60)

      let plannedSessions: PlannedSession[] = []
      if (!isRest && availableMinutes >= 30) {
        const plan = planDaySessions(
          availableMinutes,
          phase,
          weights,
          weekMockCount,
          effectiveMockCap,
          isFinalWeek,
          dow,
          isExamDay,
          tracker,
          globalDayIndex,
          confidence,
          ucatSen,
          daysUntilExamCal,
          weeksRemaining,
        )
        plannedSessions = plan.sessions
        const sessionTypes = plannedSessions.map(s => s.type)
        if (sessionTypes.includes('full_mock') || sessionTypes.includes('mini_mock')) weekMockCount++
        for (const s of plannedSessions) {
          if (s.type === 'vr_practice') tracker.vr = globalDayIndex
          if (s.type === 'dm_practice') tracker.dm = globalDayIndex
          if (s.type === 'qr_practice') tracker.qr = globalDayIndex
        }
      }

      let prevInDay: SessionType | null = null
      const enriched = plannedSessions.map(session => {
        const row = {
          ...session,
          rationale: rationaleForSession(session.type, rationaleCtx, prevInDay, session.miniMockFocus),
        }
        prevInDay = row.type
        return row
      })

      days.push({ date, isRest, availableMinutes, sessions: enriched })
      globalDayIndex++
    }

    const rampedSchoolHours = hoursForDate(
      addDays(weekStart, 1),
      examDate,
      planStart,
      schoolDayHours,
      weekendHours,
      holidayPeriods,
      w + 1,
      totalWeeks,
    )
    weeks.push({ weekNumber: w + 1, weekStart, weekType, defaultHours: rampedSchoolHours, days })
  }

  return { weeks }
}

// ─── Convert generated plan to DB rows ───────────────────────────────────────

export function planToDBRows(
  generated: GeneratedPlan,
  planId: string,
  ucatSen = false,
): {
  planWeeks: Omit<DBPlanWeek, 'created_at' | 'updated_at'>[]
  planDays: Omit<DBPlanDay, 'created_at' | 'updated_at'>[]
  sessions: Omit<DBSession, 'created_at' | 'updated_at'>[]
} {
  const planWeeks: Omit<DBPlanWeek, 'created_at' | 'updated_at'>[] = []
  const planDays: Omit<DBPlanDay, 'created_at' | 'updated_at'>[] = []
  const sessions: Omit<DBSession, 'created_at' | 'updated_at'>[] = []

  for (const week of generated.weeks) {
    const weekId = crypto.randomUUID()
    planWeeks.push({
      id: weekId,
      plan_id: planId,
      week_number: week.weekNumber,
      week_start: toISODate(week.weekStart),
      week_type: week.weekType,
      default_hours: week.defaultHours,
      difficulty_rating: null,
      is_locked: false,
      tutor_note: null,
    })

    for (const day of week.days) {
      const dayId = crypto.randomUUID()
      planDays.push({
        id: dayId,
        plan_id: planId,
        plan_week_id: weekId,
        day_date: toISODate(day.date),
        availability: day.isRest ? 'unavailable' : 'available',
        custom_hours: null,
        is_rest: day.isRest,
      })

      day.sessions.forEach((row, idx) => {
        const sessionType = row.type
        const prev = idx > 0 ? day.sessions[idx - 1].type : null
        sessions.push({
          id: crypto.randomUUID(),
          plan_id: planId,
          plan_day_id: dayId,
          day_date: toISODate(day.date),
          session_type: sessionType,
          duration_minutes: plannedSessionDurationMinutes(sessionType, ucatSen, prev),
          position: idx,
          is_timed: sessionType !== 'sjt_practice' && sessionType !== 'reflection' && sessionType !== 'rest',
          notes: sessionType === 'mini_mock' ? miniMockNote(row.miniMockFocus) : null,
          planner_rationale: row.rationale,
        })
      })
    }
  }

  return { planWeeks, planDays, sessions }
}

// ─── Difficulty adjustment ────────────────────────────────────────────────────

export function calcDifficultyAdjustment(ratings: DifficultyRating[]): number {
  const delta = ratings.reduce((acc, r) => acc + (r - 2), 0)
  return Math.max(-2, Math.min(2, delta))
}
