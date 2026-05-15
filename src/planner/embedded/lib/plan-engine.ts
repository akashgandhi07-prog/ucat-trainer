/**
 * UCAT Plan Generation Engine
 *
 * Generates structured weekly session plans from student inputs.
 * Pure functions: no Supabase calls here; the caller saves to DB.
 */

import {
  DBPlanWeek, DBPlanDay, DBSession,
  Phase, SectionWeight, SessionType, WeekType, DifficultyRating, DateRange
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

export interface PlannerRationaleContext {
  phase: Phase
  weaknessHintsList: string[]
  mockWeakestMain: WeaknessSection | null
}

function rationaleForSession(
  sessionType: SessionType,
  ctx: PlannerRationaleContext,
  previousSession: SessionType | null,
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
      return 'Block to score and review your mini mock thoroughly (about two hours).'
    }
    return 'Brief review slot to consolidate what you just practised.'
  }
  if (sessionType === 'full_mock') {
    return ctx.phase === 'final_week'
      ? 'Full mock rehearsal while you approach exam week.'
      : 'Timed mock to track stamina and pacing under pressure.'
  }
  if (sessionType === 'mini_mock') {
    return 'Shorter timed block to practise switching between sections.'
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
  if (weeksUntilExam <= 1) return 'final_week'
  if (weeksUntilExam <= 5) return 'full_mock'
  if (weeksUntilExam <= 6) return 'mini_mock'
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
 * Target timed mock sessions (each full or mini mock counts once) per week, stepped down
 * further from the exam. Short overall plans cap the target so weeks stay achievable.
 */
export function weeklyMockTarget(weeksRemaining: number, totalWeeks: number): number {
  if (weeksRemaining <= 0) return 0
  let ideal: number
  if (weeksRemaining <= 3) {
    ideal = 4
  } else if (weeksRemaining <= 7) {
    ideal = 3
  } else if (weeksRemaining <= 12) {
    ideal = 2
  } else {
    ideal = totalWeeks >= 18 ? 1 : 2
  }
  if (totalWeeks <= 6) {
    ideal = Math.min(ideal, 3)
  }
  if (totalWeeks <= 4) {
    ideal = Math.min(ideal, 2)
  }
  return Math.max(1, ideal)
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
   * toward the learner's outline (capped at 6h). Fixes term weekdays sitting at baseline
   * school hours (e.g. 2h) on the day before the exam.
   */
  if (daysUntilExam >= 1 && daysUntilExam <= 21) {
    const low = Math.max(2, schoolDayMax)
    const high = Math.min(6, Math.max(weekendMax, schoolDayMax))
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
  mini_mock:    60,
  full_mock:   120,
  reflection:   45,
  rest:          0,
}

/** Review after a timed mock: score, debrief sections, plan next steps */
const REFLECTION_AFTER_MOCK_MIN = 120
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
    return previousType === 'full_mock' || previousType === 'mini_mock'
      ? REFLECTION_AFTER_MOCK_MIN
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
  daysUntilExamCal: number,
  /** Whole-weeks until exam from this week's Monday (same basis as {@link getPhase}). */
  weeksRemainingForWeek: number,
): { sessions: SessionType[] } {
  if (isExamDay) return { sessions: [] }

  const sessions: SessionType[] = []
  let remaining = availableMinutes
  const fullMock = fullMockMinutes(ucatSen)
  const dow = _dayOfWeek
  /** Weekends, final three weeks, or whenever the weekly mock target is 3+ (needs weekdays too). */
  const preferMockDay =
    dow === 0 || dow === 6 || daysUntilExamCal <= 21 || weeklyMockCap >= 3

  if (phase === 'final_week') {
    const fullMockBlock = fullMock + REFLECTION_AFTER_MOCK_MIN
    if (remaining >= fullMockBlock) {
      sessions.push('full_mock')
      remaining -= fullMock
      sessions.push('reflection')
      remaining -= REFLECTION_AFTER_MOCK_MIN
      return { sessions }
    }
    return planPracticeSessions(
      remaining, weights, true, tracker, currentDayIndex, confidence,
    )
  }

  if (phase === 'full_mock') {
    const fullMockBlock = fullMock + REFLECTION_AFTER_MOCK_MIN
    if (weekMockCount < weeklyMockCap && remaining >= fullMockBlock) {
      sessions.push('full_mock')
      remaining -= fullMock
      sessions.push('reflection')
      remaining -= REFLECTION_AFTER_MOCK_MIN
      const weak = weakestPracticeSection(weights)
      if (remaining >= SESSION_DURATIONS[weak]) sessions.push(weak)
      return { sessions }
    }
    return planPracticeSessions(remaining, weights, true, tracker, currentDayIndex, confidence)
  }

  if (phase === 'mini_mock') {
    const miniBlock = SESSION_DURATIONS.mini_mock + REFLECTION_AFTER_MOCK_MIN
    if (weekMockCount < weeklyMockCap && remaining >= miniBlock) {
      sessions.push('mini_mock')
      remaining -= SESSION_DURATIONS.mini_mock
      sessions.push('reflection')
      remaining -= REFLECTION_AFTER_MOCK_MIN
      const weak = weakestPracticeSection(weights)
      if (remaining >= SESSION_DURATIONS[weak]) sessions.push(weak)
      return { sessions }
    }
    return planPracticeSessions(remaining, weights, true, tracker, currentDayIndex, confidence)
  }

  const miniBlock = SESSION_DURATIONS.mini_mock + REFLECTION_AFTER_MOCK_MIN
  const fullMockBlockEarly = fullMock + REFLECTION_AFTER_MOCK_MIN
  const wantFull =
    weeksRemainingForWeek <= 5 ||
    (phase === 'timed' && weeksRemainingForWeek <= 8 && daysUntilExamCal <= 21)
  if (
    (phase === 'foundations' || phase === 'timed') &&
    weekMockCount < weeklyMockCap &&
    preferMockDay &&
    remaining >= miniBlock
  ) {
    if (wantFull && remaining >= fullMockBlockEarly) {
      sessions.push('full_mock')
      remaining -= fullMock
      sessions.push('reflection')
      remaining -= REFLECTION_AFTER_MOCK_MIN
      const weak = weakestPracticeSection(weights)
      if (remaining >= SESSION_DURATIONS[weak]) sessions.push(weak)
      return { sessions }
    }
    sessions.push('mini_mock')
    remaining -= SESSION_DURATIONS.mini_mock
    sessions.push('reflection')
    remaining -= REFLECTION_AFTER_MOCK_MIN
    const weak = weakestPracticeSection(weights)
    if (remaining >= SESSION_DURATIONS[weak]) sessions.push(weak)
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
): { sessions: SessionType[] } {
  const sessions: SessionType[] = []
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
    if (remaining >= dur) { sessions.push(type); remaining -= dur; added++ }
    if (added >= 3) break
  }

  if (remaining >= REFLECTION_AFTER_PRACTICE_MIN && sessions.length >= 2) {
    sessions.push('reflection')
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
    sessions: { type: SessionType; rationale: string | null }[]
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

    const weeklyMockCap = weeklyMockTarget(weeksRemaining, totalWeeks)

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

      let sessionTypes: SessionType[] = []
      if (!isRest && availableMinutes >= 30) {
        const plan = planDaySessions(
          availableMinutes,
          phase,
          weights,
          weekMockCount,
          weeklyMockCap,
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
        sessionTypes = plan.sessions
        if (sessionTypes.includes('full_mock') || sessionTypes.includes('mini_mock')) weekMockCount++
        for (const s of sessionTypes) {
          if (s === 'vr_practice') tracker.vr = globalDayIndex
          if (s === 'dm_practice') tracker.dm = globalDayIndex
          if (s === 'qr_practice') tracker.qr = globalDayIndex
        }
      }

      let prevInDay: SessionType | null = null
      const enriched = sessionTypes.map(st => {
        const row = {
          type: st,
          rationale: rationaleForSession(st, rationaleCtx, prevInDay),
        }
        prevInDay = st
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
          notes: null,
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
