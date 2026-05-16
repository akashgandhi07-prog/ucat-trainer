/**
 * Database access helpers: thin wrappers around Supabase queries.
 * Server-side only (uses server client).
 */

import { createClient } from '@/lib/supabase/server'
import {
  DBPlan, DBPlanWeek, DBSession,
  DBSessionCompletion, DBMockScore, DBWeeklyReflection,
  DBUser, DateRange
} from '@/types'
import { generateFullPlan, planToDBRows, PlanInputs } from './plan-engine'
import {
  anchorDateForRegenerate,
  deletePlanDaysByDates,
  deletePlanTimetableByDates,
  prepareRegeneratedRows,
} from './regenerate-plan-cleanup'
import { PLAN_TIMETABLE_TABLE, PROFILES_TABLE } from '@/lib/planner-db-tables'
import { generateSlug, toISODate } from './utils'

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<DBUser | null> {
  const sb = await createClient()
  const { data } = await sb.from(PROFILES_TABLE).select('*').eq('id', userId).maybeSingle()
  return data as DBUser | null
}

export async function getCurrentUser(): Promise<DBUser | null> {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  return getUser(user.id)
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlanBySlug(slug: string) {
  const sb = await createClient()
  const { data } = await sb
    .from('plans')
    .select(`
      *,
      student:profiles!plans_student_id_fkey(*),
      tutor:profiles!plans_tutor_id_fkey(*)
    `)
    .eq('slug', slug)
    .maybeSingle()
  return data
}

export async function getPlanById(planId: string) {
  const sb = await createClient()
  const { data } = await sb
    .from('plans')
    .select(`
      *,
      student:profiles!plans_student_id_fkey(*),
      tutor:profiles!plans_tutor_id_fkey(*)
    `)
    .eq('id', planId)
    .single()
  return data
}

export async function getStudentPlan(studentId: string): Promise<DBPlan | null> {
  const sb = await createClient()
  const { data } = await sb
    .from('plans')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getTutorStudents(tutorId: string) {
  const sb = await createClient()
  const { data } = await sb
    .from('plan_members')
    .select(`
      *,
      plan:plans(*,student:profiles!plans_student_id_fkey(*))
    `)
    .eq('user_id', tutorId)
    .eq('role', 'tutor')
  return data ?? []
}

// ─── Plan weeks ───────────────────────────────────────────────────────────────

export async function getPlanWeeks(planId: string): Promise<DBPlanWeek[]> {
  const sb = await createClient()
  const { data } = await sb
    .from('plan_weeks')
    .select('*')
    .eq('plan_id', planId)
    .order('week_number')
  return data ?? []
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessionsForDate(planId: string, date: string): Promise<DBSession[]> {
  const sb = await createClient()
  const { data } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', planId)
    .eq('day_date', date)
    .order('position')
  return data ?? []
}

export async function getSessionsForWeek(planId: string, weekStart: string, weekEnd: string): Promise<DBSession[]> {
  const sb = await createClient()
  const { data } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', planId)
    .gte('day_date', weekStart)
    .lte('day_date', weekEnd)
    .order('day_date')
    .order('position')
  return data ?? []
}

export async function getAllSessions(planId: string): Promise<DBSession[]> {
  const sb = await createClient()
  const { data } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', planId)
    .order('day_date')
    .order('position')
  return data ?? []
}

// ─── Completions ──────────────────────────────────────────────────────────────

export async function getCompletionsForDate(studentId: string, date: string): Promise<DBSessionCompletion[]> {
  const sb = await createClient()
  const { data } = await sb
    .from('session_completions')
    .select(`*, ${PLAN_TIMETABLE_TABLE}!inner(day_date)`)
    .eq('student_id', studentId)
    .eq(`${PLAN_TIMETABLE_TABLE}.day_date`, date)
  return data ?? []
}

export async function getAllCompletions(studentId: string, planId: string): Promise<DBSessionCompletion[]> {
  const sb = await createClient()
  const { data } = await sb
    .from('session_completions')
    .select(`*, ${PLAN_TIMETABLE_TABLE}!inner(plan_id)`)
    .eq('student_id', studentId)
    .eq(`${PLAN_TIMETABLE_TABLE}.plan_id`, planId)
  return data ?? []
}

export async function toggleCompletion(sessionId: string, studentId: string, completed: boolean) {
  const sb = await createClient()
  if (completed) {
    await sb
      .from('session_completions')
      .upsert(
        { session_id: sessionId, student_id: studentId },
        { onConflict: 'session_id,student_id' }
      )
  } else {
    await sb.from('session_completions')
      .delete()
      .eq('session_id', sessionId)
      .eq('student_id', studentId)
  }
}

// ─── Mock scores ──────────────────────────────────────────────────────────────

export async function getMockScores(planId: string): Promise<DBMockScore[]> {
  const sb = await createClient()
  const { data } = await sb
    .from('mock_scores')
    .select('*')
    .eq('plan_id', planId)
    .order('logged_date')
  return data ?? []
}

export async function getLatestMockScore(planId: string): Promise<DBMockScore | null> {
  const sb = await createClient()
  const { data } = await sb
    .from('mock_scores')
    .select('*')
    .eq('plan_id', planId)
    .order('logged_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ─── Weekly reflections ───────────────────────────────────────────────────────

export async function getWeeklyReflections(planId: string): Promise<DBWeeklyReflection[]> {
  const sb = await createClient()
  const { data } = await sb
    .from('weekly_reflections')
    .select('*')
    .eq('plan_id', planId)
    .order('week_number')
  return data ?? []
}

// ─── Streak calculation ───────────────────────────────────────────────────────

export async function calcStreak(studentId: string): Promise<number> {
  const sb = await createClient()
  const { data } = await sb
    .from('session_completions')
    .select(`${PLAN_TIMETABLE_TABLE}!inner(day_date)`)
    .eq('student_id', studentId)
    .order(`${PLAN_TIMETABLE_TABLE}(day_date)`, { ascending: false })
  if (!data || data.length === 0) return 0

  // Extract unique dates with completions
  const datesWithCompletions = new Set<string>()
  for (const row of data as any[]) {
    const slot = row[PLAN_TIMETABLE_TABLE]
    if (slot?.day_date) datesWithCompletions.add(slot.day_date)
  }

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const check = new Date(today)

  while (true) {
    const dateStr = toISODate(check)
    if (datesWithCompletions.has(dateStr)) {
      streak++
      check.setDate(check.getDate() - 1)
    } else if (streak === 0 && toISODate(check) === toISODate(today)) {
      // today not yet completed; check yesterday to allow ongoing streak display
      check.setDate(check.getDate() - 1)
      continue
    } else {
      break
    }
  }

  return streak
}

// ─── Day availability ─────────────────────────────────────────────────────────

/**
 * Update a day's availability (busy / reduced hours / available).
 * Regenerates sessions for that specific day afterwards.
 */
export async function updateDayAvailability(
  planId: string,
  dayDate: string,
  availability: 'available' | 'reduced' | 'unavailable',
  customHours?: number | null,
) {
  const sb = await createClient()
  const isRest = availability === 'unavailable'

  // Upsert the plan_day record
  const { data: existingDay } = await sb
    .from('plan_days')
    .select('id')
    .eq('plan_id', planId)
    .eq('day_date', dayDate)
    .maybeSingle()

  if (existingDay) {
    await sb.from('plan_days').update({
      availability,
      is_rest: isRest,
      custom_hours: customHours ?? null,
    }).eq('id', existingDay.id)
  } else {
    await sb.from('plan_days').insert({
      plan_id: planId,
      day_date: dayDate,
      availability,
      is_rest: isRest,
      custom_hours: customHours ?? null,
    })
  }

  // Delete existing sessions for that day and regenerate
  await sb.from(PLAN_TIMETABLE_TABLE).delete().eq('plan_id', planId).eq('day_date', dayDate)
}

export async function updateExamDateTime(
  planId: string,
  examDate: string,
  examTime: string | null,
  ucatSen?: boolean,
) {
  const sb = await createClient()
  const patch: { exam_date: string; exam_time: string | null; ucat_sen?: boolean } = {
    exam_date: examDate,
    exam_time: examTime,
  }
  if (typeof ucatSen === 'boolean') patch.ucat_sen = ucatSen
  await sb.from('plans').update(patch).eq('id', planId)
}

// ─── Plan creation ────────────────────────────────────────────────────────────

export async function createPlan(
  inputs: PlanInputs,
  studentId: string,
  tutorId?: string,
  examTime?: string | null,
  currentSituation?: string | null,
  schoolYear?: string | null,
) {
  const sb = await createClient()
  const slug = generateSlug()

  // Archive any existing active plans so there's always exactly one
  await sb.from('plans').update({ status: 'archived' }).eq('student_id', studentId).eq('status', 'active')

  const { data: plan, error: planError } = await sb.from('plans').insert({
    slug,
    student_id: studentId,
    tutor_id: tutorId ?? null,
    exam_date: toISODate(inputs.examDate),
    exam_time: examTime ?? null,
    current_situation: currentSituation ?? null,
    school_year: schoolYear ?? null,
    has_prior_experience: inputs.hasPriorExperience,
    confidence_vr: inputs.confidence.vr,
    confidence_dm: inputs.confidence.dm,
    confidence_qr: inputs.confidence.qr,
    confidence_sjt: inputs.confidence.sjt,
    rest_days: inputs.restDays,
    school_day_hours: inputs.schoolDayHours,
    weekend_hours: inputs.weekendHours,
    holiday_periods: inputs.holidayPeriods,
    ucat_sen: inputs.ucatSen ?? false,
  }).select().single()

  if (planError || !plan) throw planError ?? new Error('Plan creation failed')

  const generated = generateFullPlan({ ...inputs, planId: plan.id })
  const { planWeeks, planDays, sessions } = planToDBRows(generated, plan.id, inputs.ucatSen ?? false)

  // Batch inserts
  await sb.from('plan_weeks').insert(planWeeks)
  await sb.from('plan_days').insert(planDays)
  await sb.from(PLAN_TIMETABLE_TABLE).insert(sessions)

  // Add plan_members entry
  await sb.from('plan_members').insert({ plan_id: plan.id, user_id: studentId, role: 'student' })
  if (tutorId) {
    await sb.from('plan_members').insert({ plan_id: plan.id, user_id: tutorId, role: 'tutor' })
  }

  return plan as DBPlan
}

// ─── Regenerate future weeks ──────────────────────────────────────────────────

export async function regenerateFutureWeeks(planId: string, fromWeekNumber: number) {
  const sb = await createClient()

  const plan = await getPlanById(planId)
  if (!plan) throw new Error('Plan not found')

  const reflections = await getWeeklyReflections(planId)
  const ratings = reflections
    .filter(r => r.week_number < fromWeekNumber)
    .map(r => r.difficulty_rating as 1 | 2 | 3)

  const latestMock = await getLatestMockScore(planId)

  // Load user-marked busy days (individual date overrides) as busy periods
  const { data: busyDays } = await sb
    .from('plan_days')
    .select('day_date')
    .eq('plan_id', planId)
    .eq('is_rest', true)
    .eq('availability', 'unavailable')

  // Wrap individual busy dates as single-day DateRange entries
  const busyPeriods: DateRange[] = (busyDays ?? []).map(d => ({
    start: d.day_date,
    end: d.day_date,
  }))

  const inputs: PlanInputs = {
    planId,
    examDate: new Date(plan.exam_date),
    hasPriorExperience: plan.has_prior_experience,
    confidence: {
      vr: plan.confidence_vr,
      dm: plan.confidence_dm,
      qr: plan.confidence_qr,
      sjt: plan.confidence_sjt,
    },
    schoolDayHours: (plan as any).school_day_hours ?? 2,
    weekendHours: (plan as any).weekend_hours ?? 4,
    holidayPeriods: (plan as any).holiday_periods ?? [],
    restDays: plan.rest_days ?? [],
    busyPeriods,
    difficultyAdjustment: ratings.reduce((acc, r) => acc + (r - 2), 0),
    latestMockScores: latestMock ? {
      vr: latestMock.score_vr,
      dm: latestMock.score_dm,
      qr: latestMock.score_qr,
    } : null,
    weaknessTags: (latestMock as { weakness_tags?: string[] })?.weakness_tags ?? [],
    regenerateFromWeek: fromWeekNumber,
    ucatSen: (plan as DBPlan).ucat_sen ?? false,
  }

  const { data: weeks } = await sb
    .from('plan_weeks')
    .select('*')
    .eq('plan_id', planId)
    .order('week_number')

  const generated = generateFullPlan(inputs)
  const { planWeeks: newWeeks, planDays: newDays, sessions: newSessions } = planToDBRows(
    generated,
    planId,
    inputs.ucatSen ?? false,
  )

  const weekRows = weeks ?? []
  const fromDateIso = anchorDateForRegenerate(weekRows, fromWeekNumber)
  const {
    datesToClear,
    futureNewWeeks,
    futureNewDays,
    futureNewSessions,
    futureWeekRowIds,
  } = prepareRegeneratedRows(
    weekRows,
    fromWeekNumber,
    fromDateIso,
    newWeeks,
    newDays,
    newSessions,
  )

  if (datesToClear.length > 0) {
    await deletePlanTimetableByDates(sb, planId, PLAN_TIMETABLE_TABLE, datesToClear)
    await deletePlanDaysByDates(sb, planId, datesToClear)
  }

  if (futureWeekRowIds.length > 0) {
    await sb.from('plan_weeks').delete().in('id', futureWeekRowIds)
  }

  if (futureNewWeeks.length) await sb.from('plan_weeks').insert(futureNewWeeks)
  if (futureNewDays.length) await sb.from('plan_days').insert(futureNewDays)
  if (futureNewSessions.length) await sb.from(PLAN_TIMETABLE_TABLE).insert(futureNewSessions)
}
