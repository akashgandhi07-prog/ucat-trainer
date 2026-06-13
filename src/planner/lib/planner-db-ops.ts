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
import { supabase } from '../../lib/supabase'
import { invalidateActivePlanCache, PLAN_COLUMNS, PLAN_WEEK_COLUMNS } from './load-planner-data'

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
  const [plan, reflectionsRes, latestMockRes, busyDaysRes, weeksRes] = await Promise.all([
    getPlanById(planId),
    supabase
      .from('weekly_reflections')
      .select('week_number, difficulty_rating')
      .eq('plan_id', planId)
      .order('week_number'),
    supabase
      .from('mock_scores')
      .select('score_vr, score_dm, score_qr, weakness_tags')
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
  ])
  if (!plan) throw new Error('Plan not found')

  const { data: reflections } = reflectionsRes
  const { data: latestMock } = latestMockRes
  const { data: busyDays } = busyDaysRes
  const { data: weeks } = weeksRes

  const ratings = (reflections ?? [])
    .filter((r) => r.week_number < fromWeekNumber)
    .map((r) => r.difficulty_rating as 1 | 2 | 3)

  const busyPeriods: DateRange[] = (busyDays ?? []).map((d) => ({
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
    weaknessTags: (latestMock as { weakness_tags?: string[] })?.weakness_tags ?? [],
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
