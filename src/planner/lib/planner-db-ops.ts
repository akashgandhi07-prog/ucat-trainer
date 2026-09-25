import type { DateRange, DBPlan } from '../embedded/types'
import {
  calcDifficultyAdjustment,
  generateFullPlan,
  planToDBRows,
  type PlanInputs,
} from '../embedded/lib/plan-engine'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import {
  anchorDateForRegenerate,
  prepareRegeneratedRows,
} from '../embedded/lib/regenerate-plan-cleanup'
import { addDays, parseDate, toISODate } from '../embedded/lib/utils'
import { supabase } from '../../lib/supabase'
import { invalidateActivePlanCache, PLAN_COLUMNS, PLAN_WEEK_COLUMNS } from './load-planner-data'

/**
 * Completed-vs-planned minutes over the trailing three weeks. Drives the engine's
 * adherence throttle so a plan the student keeps missing gets lighter, not heavier.
 * Returns null when there isn't enough recent history to judge fairly.
 */
async function computeAdherenceRatio(planId: string, studentId: string): Promise<number | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowStartIso = toISODate(addDays(today, -21))
  const todayIso = toISODate(today)

  const { data: sessions } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .select('id, duration_minutes, session_type')
    .eq('plan_id', planId)
    .gte('day_date', windowStartIso)
    .lt('day_date', todayIso)

  const planned = (sessions ?? []).filter((s) => s.session_type !== 'rest')
  const plannedMin = planned.reduce((a, s) => a + (Number(s.duration_minutes) || 0), 0)
  if (planned.length < 3 || plannedMin <= 0) return null

  const ids = planned.map((s) => s.id as string)
  const { data: comps } = await supabase
    .from('session_completions')
    .select('minutes_completed, session_id')
    .eq('student_id', studentId)
    .in('session_id', ids)

  const doneMin = (comps ?? []).reduce((a, c) => a + Math.max(0, Number(c.minutes_completed) || 0), 0)
  return Math.max(0, Math.min(1.5, doneMin / plannedMin))
}

/** Convert repeated weak component results in the skill trainers into the same focused
 * tags used by the plan engine. We require at least three observations and <70%
 * accuracy so one early mistake cannot rewrite a student's plan. */
async function getTrainerWeaknessTags(studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('skill_trainer_attempts')
    .select('trainer_type, components')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    // Enough recent rows to represent several complete sessions in all four trainers.
    .limit(240)
  if (error || !data?.length) return []

  const totals = new Map<string, { correct: number; total: number }>()
  for (const row of data) {
    const components = row.components as Record<string, boolean> | null
    for (const [component, correct] of Object.entries(components ?? {})) {
      const key = `${row.trainer_type}:${component}`
      const current = totals.get(key) ?? { correct: 0, total: 0 }
      current.total++
      if (correct) current.correct++
      totals.set(key, current)
    }
  }

  const weak = (trainer: string, components: string[]) => components.some((component) => {
    const result = totals.get(`${trainer}:${component}`)
    return result != null && result.total >= 3 && result.correct / result.total < 0.7
  })

  const tags: string[] = []
  if (weak('qr_setup', ['information', 'operation', 'calculator_entry'])) tags.push('qr_setup')
  if (weak('qr_setup', ['unit']) || weak('qr_extraction', ['value', 'unit'])) tags.push('qr_accuracy')
  if (weak('qr_estimation', ['range', 'strategy'])) tags.push('qr_speed')
  if (weak('dm_constraints', ['constraints'])) tags.push('dm_logic')
  return tags
}

export async function updateDayAvailability(
  planId: string,
  dayDate: string,
  availability: 'available' | 'reduced' | 'unavailable',
  customHours?: number | null,
): Promise<void> {
  const isRest = availability === 'unavailable'

  const { data: existingDay } = await supabase
    .from('plan_days')
    .select('id')
    .eq('plan_id', planId)
    .eq('day_date', dayDate)
    .maybeSingle()

  if (existingDay) {
    const { error } = await supabase
      .from('plan_days')
      .update({
        availability,
        is_rest: isRest,
        custom_hours: customHours ?? null,
      })
      .eq('id', existingDay.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('plan_days').insert({
      plan_id: planId,
      day_date: dayDate,
      availability,
      is_rest: isRest,
      custom_hours: customHours ?? null,
    })
    if (error) throw new Error(error.message)
  }

  const { error: delErr } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .delete()
    .eq('plan_id', planId)
    .eq('day_date', dayDate)
  if (delErr) throw new Error(delErr.message)
}

async function getPlanById(planId: string): Promise<DBPlan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select(PLAN_COLUMNS)
    .eq('id', planId)
    .single()
  if (error) return null
  return data as unknown as DBPlan
}

export async function regenerateFutureWeeks(planId: string, fromWeekNumber: number): Promise<void> {
  // All five reads are keyed on planId only, so fetch them in one round trip.
  const [plan, reflectionsRes, latestMockRes, busyDaysRes, weeksRes, mockCountRes] = await Promise.all([
    getPlanById(planId),
    supabase
      .from('weekly_reflections')
      .select('week_number, difficulty_rating')
      .eq('plan_id', planId)
      .order('week_number'),
    supabase
      .from('mock_scores')
      .select('score_vr, score_dm, score_qr, score_sjt, weakness_tags')
      .eq('plan_id', planId)
      .order('logged_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('plan_days')
      .select('day_date')
      .eq('plan_id', planId)
      .eq('is_rest', true)
      .eq('availability', 'unavailable'),
    supabase
      .from('plan_weeks')
      .select(PLAN_WEEK_COLUMNS)
      .eq('plan_id', planId)
      .order('week_number'),
    supabase
      .from('mock_scores')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', planId),
  ])
  if (!plan) throw new Error('Plan not found')

  const { data: reflections } = reflectionsRes
  const { data: latestMock } = latestMockRes
  const { data: busyDays } = busyDaysRes
  const { data: weeks } = weeksRes

  // Adherence needs the student id, so it runs after the plan row resolves.
  const [adherenceRatio, trainerWeaknessTags] = await Promise.all([
    computeAdherenceRatio(planId, plan.student_id),
    getTrainerWeaknessTags(plan.student_id),
  ])

  const ratings = (reflections ?? [])
    .filter((r) => r.week_number < fromWeekNumber)
    .map((r) => r.difficulty_rating as 1 | 2 | 3)

  const busyPeriods: DateRange[] = (busyDays ?? []).map((d) => ({
    start: d.day_date,
    end: d.day_date,
  }))

  // Carry each existing week's chosen intensity through the rebuild, keyed by its Monday.
  // Without this every regenerate (mock logged, availability edit, exam-date change) would
  // silently reset the student's per-week effort dials back to standard.
  const weekIntensities: Record<string, 'lighter' | 'standard' | 'harder'> = {}
  for (const wk of weeks ?? []) {
    const intensity = (wk as { week_start?: string; intensity?: string }).intensity
    if (wk.week_start && (intensity === 'lighter' || intensity === 'harder')) {
      weekIntensities[wk.week_start] = intensity
    }
  }

  const inputs: PlanInputs = {
    planId,
    // parseDate, not new Date(): the latter reads a bare YYYY-MM-DD as UTC
    // midnight, which lands on the previous day west of Greenwich and would
    // shift every rebuilt plan by a day. Plan creation already uses parseDate.
    examDate: parseDate(plan.exam_date),
    hasPriorExperience: plan.has_prior_experience,
    confidence: {
      vr: plan.confidence_vr,
      dm: plan.confidence_dm,
      qr: plan.confidence_qr,
      sjt: plan.confidence_sjt,
    },
    schoolDayHours: plan.school_day_hours ?? 2,
    weekendHours: plan.weekend_hours ?? 4,
    holidayPeriods: plan.holiday_periods ?? [],
    restDays: plan.rest_days ?? [],
    busyPeriods,
    difficultyAdjustment: calcDifficultyAdjustment(ratings),
    latestMockScores: latestMock
      ? {
          vr: latestMock.score_vr,
          dm: latestMock.score_dm,
          qr: latestMock.score_qr,
        }
      : null,
    latestSjtBand: (latestMock as { score_sjt?: number | null })?.score_sjt ?? null,
    weaknessTags: [...new Set([
      ...((latestMock as { weakness_tags?: string[] })?.weakness_tags ?? []),
      ...trainerWeaknessTags,
    ])],
    mockCount: mockCountRes.count ?? 0,
    mockTargetTotal: plan.mock_target_total ?? null,
    mockTargetSjtBand: plan.mock_target_sjt_band ?? null,
    adherenceRatio,
    weekIntensities,
    regenerateFromWeek: fromWeekNumber,
    ucatSen: plan.ucat_sen ?? false,
  }

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
    toISODate(new Date()),
  )

  // One transactional round trip: deletes and inserts succeed or fail together, so a
  // crash or dropped connection can never leave the plan half-rebuilt.
  const { error: rpcErr } = await supabase.rpc('apply_plan_regeneration', {
    p_plan_id: planId,
    p_dates_to_clear: datesToClear,
    p_week_ids_to_delete: futureWeekRowIds,
    p_new_weeks: futureNewWeeks,
    p_new_days: futureNewDays,
    p_new_sessions: futureNewSessions,
  })
  if (rpcErr) throw new Error(rpcErr.message)

  invalidateActivePlanCache(plan.student_id)
}
