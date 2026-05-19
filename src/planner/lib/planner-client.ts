import type { MockSource, MockType } from '../embedded/types'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import { weekNumberForCalendarDate } from '../embedded/lib/week-for-plan-date'
import { toISODate } from '../embedded/lib/utils'
import {
  UCAT_EXAM_WINDOW_END_ISO,
  UCAT_EXAM_WINDOW_START_ISO,
  isWithinUcatExamWindow,
  normaliseExamDateIso,
} from '../../lib/ucatExamWindow'
import { supabase } from '../../lib/supabase'
import { requireStudentOrTutorPlan } from './planner-guard'
import { regenerateFutureWeeks, updateDayAvailability } from './planner-db-ops'

const MOCK_SOURCES = new Set<MockSource>([
  'medify',
  'medentry',
  'passmedicine',
  'book',
  'official',
])

function parseSection300(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isInteger(n) || n < 300 || n > 900) return null
  return n
}

function parseSjt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isInteger(n) || n < 1 || n > 4) return null
  return n
}

export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

export async function completeSession(input: {
  sessionId: string
  completed: boolean
  minutesCompleted: number | null
  perceivedEffort: number | null
}): Promise<void> {
  const userId = await getCurrentUserId()
  const { sessionId, completed, minutesCompleted, perceivedEffort } = input

  const { data: sessionRow, error: sessionErr } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .select('id, plan_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessionErr) throw new Error(sessionErr.message)
  if (!sessionRow) throw new Error('Session not found')

  const gate = await requireStudentOrTutorPlan(sessionRow.plan_id, userId)
  if (!gate.ok) throw new Error(gate.message)

  if (completed) {
    const parsedMinutes = Number(minutesCompleted)
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
      throw new Error('minutesCompleted must be a non-negative number')
    }
    let pe: number | null = null
    if (perceivedEffort !== undefined && perceivedEffort !== null) {
      const raw = Number(perceivedEffort)
      if (!Number.isFinite(raw)) throw new Error('perceivedEffort must be between 1 and 5 when set')
      const rounded = Math.round(raw)
      if (rounded < 1 || rounded > 5) throw new Error('perceivedEffort must be between 1 and 5')
      pe = rounded
    }
    const { error } = await supabase.from('session_completions').upsert(
      {
        session_id: sessionId,
        student_id: gate.studentId,
        minutes_completed: Math.round(parsedMinutes),
        perceived_effort: pe,
      },
      { onConflict: 'session_id,student_id' },
    )
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('session_completions')
      .delete()
      .eq('session_id', sessionId)
      .eq('student_id', gate.studentId)
    if (error) throw new Error(error.message)
  }
}

export async function updatePlanDay(input: {
  planId: string
  dayDate: string
  availability: 'available' | 'reduced' | 'unavailable'
  customHours?: number | null
}): Promise<void> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  await updateDayAvailability(
    input.planId,
    input.dayDate,
    input.availability,
    input.availability === 'reduced' ? input.customHours ?? null : null,
  )

  const { data: weeks } = await supabase
    .from('plan_weeks')
    .select('week_number, week_start')
    .eq('plan_id', input.planId)

  const weekNum = weekNumberForCalendarDate(weeks ?? [], input.dayDate)
  if (weekNum != null) {
    try {
      await regenerateFutureWeeks(input.planId, weekNum)
    } catch {
      /* non-fatal */
    }
  }
}

export async function updateExamDateTime(input: {
  planId: string
  examDate: string
  examTime: string | null
  regenerate?: boolean
}): Promise<void> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  const examIso = normaliseExamDateIso(input.examDate)
  if (!examIso || !isWithinUcatExamWindow(examIso)) {
    throw new Error(
      `Exam date must be between ${UCAT_EXAM_WINDOW_START_ISO} and ${UCAT_EXAM_WINDOW_END_ISO}.`,
    )
  }

  const { error: planErr } = await supabase
    .from('plans')
    .update({
      exam_date: examIso,
      exam_time: input.examTime || null,
    })
    .eq('id', input.planId)
  if (planErr) throw new Error(planErr.message)

  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: gate.studentId,
        ucat_exam_date: examIso,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (profileErr) throw new Error(profileErr.message)

  if (input.regenerate ?? true) {
    const { data: weeks } = await supabase
      .from('plan_weeks')
      .select('week_number, week_start')
      .eq('plan_id', input.planId)
    const currentWeek = weekNumberForCalendarDate(weeks ?? [], toISODate(new Date())) ?? 1
    await regenerateFutureWeeks(input.planId, currentWeek)
  }
}

export async function addMockScore(input: {
  planId: string
  mockDate: string
  mockType: MockType
  scoreVr?: number | null
  scoreDm?: number | null
  scoreQr?: number | null
  scoreSjt?: number | null
  mockSource?: MockSource | null
  weaknessTags?: string[]
}): Promise<unknown> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  const scoreVr = parseSection300(input.scoreVr)
  const scoreDm = parseSection300(input.scoreDm)
  const scoreQr = parseSection300(input.scoreQr)
  const scoreSjt = parseSjt(input.scoreSjt)

  if (scoreVr === null && scoreDm === null && scoreQr === null && scoreSjt === null) {
    throw new Error('Provide at least one score')
  }

  let mockSource: MockSource | null = null
  if (input.mockSource && MOCK_SOURCES.has(input.mockSource)) {
    mockSource = input.mockSource
  }

  const { data: weeks } = await supabase
    .from('plan_weeks')
    .select('week_number, week_start')
    .eq('plan_id', input.planId)

  const weekNumber = weekNumberForCalendarDate(weeks ?? [], input.mockDate)

  const { data: row, error } = await supabase
    .from('mock_scores')
    .insert({
      plan_id: input.planId,
      student_id: gate.studentId,
      session_id: null,
      logged_date: input.mockDate,
      week_number: weekNumber,
      score_vr: scoreVr,
      score_dm: scoreDm,
      score_qr: scoreQr,
      score_sjt: scoreSjt,
      mock_type: input.mockType,
      mock_source: mockSource,
      weakness_tags: input.weaknessTags ?? [],
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return row
}

export async function updateMockTargets(input: {
  planId: string
  mockTargetTotal: number | null
  mockTargetSjtBand: number | null
}): Promise<void> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  const { error } = await supabase
    .from('plans')
    .update({
      mock_target_total: input.mockTargetTotal,
      mock_target_sjt_band: input.mockTargetSjtBand,
    })
    .eq('id', input.planId)
  if (error) throw new Error(error.message)
}

export async function saveExtraStudy(input: {
  planId: string
  dayDate: string
  section: 'vr' | 'dm' | 'qr' | 'sjt'
  minutes: number
}): Promise<void> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  if (input.minutes === 0) {
    const { error } = await supabase
      .from('extra_study_logs')
      .delete()
      .eq('plan_id', input.planId)
      .eq('student_id', gate.studentId)
      .eq('day_date', input.dayDate)
      .eq('section', input.section)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('extra_study_logs').upsert(
    {
      plan_id: input.planId,
      student_id: gate.studentId,
      day_date: input.dayDate,
      section: input.section,
      minutes: Math.round(input.minutes),
    },
    { onConflict: 'plan_id,student_id,day_date,section' },
  )
  if (error) throw new Error(error.message)
}

const SECTION_KEYS = new Set(['vr', 'dm', 'qr', 'sjt'])

function bumpPracticeConfidence(cur: number): number {
  const n = Number.isFinite(cur) ? Math.round(cur) : 3
  const clamped = Math.min(5, Math.max(1, n))
  return Math.max(1, clamped - 1)
}

export async function rebalancePlan(input: {
  planId: string
  fromDate: string
  schoolDayHours: number
  weekendHours: number
  needsMore: string[]
}): Promise<{ warnings: string[] }> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  const { data: planRow } = await supabase
    .from('plans')
    .select('confidence_vr, confidence_dm, confidence_qr, confidence_sjt')
    .eq('id', input.planId)
    .maybeSingle()

  if (!planRow) throw new Error('Plan not found')

  const patch: Record<string, unknown> = {
    school_day_hours: input.schoolDayHours,
    weekend_hours: input.weekendHours,
  }

  const adjusted: string[] = []
  for (const key of input.needsMore) {
    if (!SECTION_KEYS.has(key)) continue
    const col =
      key === 'vr'
        ? 'confidence_vr'
        : key === 'dm'
          ? 'confidence_dm'
          : key === 'qr'
            ? 'confidence_qr'
            : 'confidence_sjt'
    const prev = planRow[col as keyof typeof planRow] as number
    const next = bumpPracticeConfidence(prev)
    patch[col] = next
    if (next !== prev) adjusted.push(key.toUpperCase())
  }

  const { error: upErr } = await supabase.from('plans').update(patch).eq('id', input.planId)
  if (upErr) throw new Error(upErr.message)

  const { data: weeks } = await supabase
    .from('plan_weeks')
    .select('week_number, week_start')
    .eq('plan_id', input.planId)

  const weekNum = weekNumberForCalendarDate(weeks ?? [], input.fromDate)
  if (weekNum == null) throw new Error('Could not match fromDate to a week in this plan')

  await regenerateFutureWeeks(input.planId, weekNum)

  const warnings: string[] = []
  if (adjusted.length > 0) {
    warnings.push(
      `Practice emphasis increased for ${adjusted.join(', ')} (confidence nudged toward more scheduled time).`,
    )
  }
  return { warnings }
}

export async function saveWeeklyReflection(input: {
  planId: string
  weekNumber: number
  reflectionText: string
  difficultyRating: 1 | 2 | 3
}): Promise<void> {
  const userId = await getCurrentUserId()
  const gate = await requireStudentOrTutorPlan(input.planId, userId)
  if (!gate.ok) throw new Error(gate.message)

  const { error } = await supabase.from('weekly_reflections').upsert(
    {
      plan_id: input.planId,
      student_id: gate.studentId,
      week_number: input.weekNumber,
      reflection_text: input.reflectionText.trim(),
      difficulty_rating: input.difficultyRating,
    },
    { onConflict: 'plan_id,week_number' },
  )
  if (error) throw new Error(error.message)

  try {
    await regenerateFutureWeeks(input.planId, input.weekNumber + 1)
  } catch {
    /* non-fatal */
  }
}
