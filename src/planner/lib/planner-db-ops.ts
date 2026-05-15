import type { DateRange, DBPlan, DBPlanDay, DBPlanWeek, DBSession } from '../embedded/types'
import { generateFullPlan, planToDBRows, type PlanInputs } from '../embedded/lib/plan-engine'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import { supabase } from '../../lib/supabase'

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
  const { data, error } = await supabase.from('plans').select('*').eq('id', planId).single()
  if (error) return null
  return data as DBPlan
}

export async function regenerateFutureWeeks(planId: string, fromWeekNumber: number): Promise<void> {
  const plan = await getPlanById(planId)
  if (!plan) throw new Error('Plan not found')

  const { data: reflections } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('plan_id', planId)
    .order('week_number')

  const ratings = (reflections ?? [])
    .filter((r) => r.week_number < fromWeekNumber)
    .map((r) => r.difficulty_rating as 1 | 2 | 3)

  const { data: latestMock } = await supabase
    .from('mock_scores')
    .select('*')
    .eq('plan_id', planId)
    .order('logged_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: busyDays } = await supabase
    .from('plan_days')
    .select('day_date')
    .eq('plan_id', planId)
    .eq('is_rest', true)
    .eq('availability', 'unavailable')

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
    difficultyAdjustment: ratings.reduce((acc, r) => acc + (r - 2), 0),
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

  const { data: weeks } = await supabase
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

  const futureWeekIds = (weeks ?? [])
    .filter((w) => w.week_number >= fromWeekNumber && !w.is_locked)
    .map((w) => w.id)

  if (futureWeekIds.length > 0) {
    const { error } = await supabase.from('plan_weeks').delete().in('id', futureWeekIds)
    if (error) throw new Error(error.message)
  }

  const futureNewWeeks = newWeeks.filter((w) => w.week_number >= fromWeekNumber) as DBPlanWeek[]
  const futureNewDays = newDays.filter((d) => {
    return futureNewWeeks.some((w) => w.id === d.plan_week_id)
  }) as DBPlanDay[]
  const futureNewSessions = newSessions.filter((s) => {
    return futureNewDays.some((d) => d.id === s.plan_day_id)
  }) as DBSession[]

  if (futureNewWeeks.length) {
    const { error } = await supabase.from('plan_weeks').insert(futureNewWeeks)
    if (error) throw new Error(error.message)
  }
  if (futureNewDays.length) {
    const { error } = await supabase.from('plan_days').insert(futureNewDays)
    if (error) throw new Error(error.message)
  }
  if (futureNewSessions.length) {
    const { error } = await supabase.from(PLAN_TIMETABLE_TABLE).insert(futureNewSessions)
    if (error) throw new Error(error.message)
  }
}
