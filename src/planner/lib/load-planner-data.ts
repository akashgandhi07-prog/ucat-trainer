import type {
  DBMockScore,
  DBPlan,
  DBPlanDay,
  DBPlanWeek,
  DBSession,
  DBWeeklyReflection,
} from '../embedded/types'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import { toISODate } from './date-utils'
import { supabase } from '../../lib/supabase'

export type SessionWithCompletion = DBSession & {
  completed: boolean
  completed_minutes?: number | null
  perceived_effort?: number | null
}

export async function fetchActivePlan(studentId: string): Promise<DBPlan | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as DBPlan | null
}

export async function loadTodayDashboard(
  studentId: string,
  plan: DBPlan,
): Promise<{
  sessions: SessionWithCompletion[]
  planDay: DBPlanDay | null
  planId: string
  examDate: string
  streak: number
  weeklyCompletion: number
  todayDate: string
  insights?: string[]
}> {
  const today = toISODate(new Date())

  const { data: sessions, error: sessErr } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', plan.id)
    .eq('day_date', today)
    .order('position')
  if (sessErr) throw new Error(sessErr.message)

  const { data: planDay } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('day_date', today)
    .maybeSingle()

  const sessionIds = (sessions ?? []).map((s) => s.id)
  const { data: completions } =
    sessionIds.length > 0
      ? await supabase
          .from('session_completions')
          .select('session_id, minutes_completed, perceived_effort')
          .eq('student_id', studentId)
          .in('session_id', sessionIds)
      : { data: [] }

  const completionsBySession = new Map(
    (completions ?? []).map((c) => [
      c.session_id,
      {
        minutes: c.minutes_completed as number,
        perceived: (c.perceived_effort ?? null) as number | null,
      },
    ]),
  )

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { data: weekSessions } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .select('id')
    .eq('plan_id', plan.id)
    .gte('day_date', toISODate(weekStart))
    .lte('day_date', toISODate(weekEnd))
    .not('session_type', 'eq', 'rest')

  const weekSessionIds = (weekSessions ?? []).map((s) => s.id)
  const { data: weekCompletions } =
    weekSessionIds.length > 0
      ? await supabase
          .from('session_completions')
          .select('id')
          .eq('student_id', studentId)
          .in('session_id', weekSessionIds)
      : { data: [] }

  const weeklyCompletion = weekSessions?.length
    ? Math.round(((weekCompletions?.length ?? 0) / weekSessions.length) * 100)
    : 0

  const { data: recentCompletions } = await supabase
    .from('session_completions')
    .select(`${PLAN_TIMETABLE_TABLE}!inner(day_date)`)
    .eq('student_id', studentId)
    .order('completed_at', { ascending: false })
    .limit(200)

  const datesWithActivity = new Set<string>()
  for (const row of (recentCompletions ?? []) as Record<string, { day_date?: string }>[]) {
    const slot = row[PLAN_TIMETABLE_TABLE]
    if (slot?.day_date) datesWithActivity.add(slot.day_date)
  }

  let streak = 0
  const checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)
  for (let i = 0; i < 60; i++) {
    const d = toISODate(checkDate)
    if (datesWithActivity.has(d)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  const insights: string[] = []
  const horizonStart = new Date()
  horizonStart.setDate(horizonStart.getDate() - 30)
  horizonStart.setHours(0, 0, 0, 0)

  const { data: horizonSessions } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .select('id, day_date, duration_minutes, session_type')
    .eq('plan_id', plan.id)
    .gte('day_date', toISODate(horizonStart))

  const horizonIds = (horizonSessions ?? []).map((s) => s.id)
  const sessById = new Map((horizonSessions ?? []).map((s) => [s.id, s]))

  const { data: horizonCompletions } =
    horizonIds.length > 0
      ? await supabase
          .from('session_completions')
          .select('session_id, minutes_completed, perceived_effort')
          .eq('student_id', studentId)
          .in('session_id', horizonIds)
      : { data: [] }

  const planDatesWithWork = new Set<string>()
  for (const c of horizonCompletions ?? []) {
    const row = sessById.get(c.session_id)
    if (!row || c.minutes_completed <= 0) continue
    planDatesWithWork.add(row.day_date)
  }

  let quietRun = 0
  for (let i = 1; i <= 21; i++) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const iso = toISODate(d)
    if (planDatesWithWork.has(iso)) break
    quietRun++
  }

  if (quietRun >= 5) {
    insights.push(
      `No logged sessions on this plan for ${quietRun} days straight. Easing weekday targets via Rebuild plan ahead can reboot momentum.`,
    )
  }

  if (weeklyCompletion > 0 && weeklyCompletion < 35 && weekSessionIds.length >= 4) {
    insights.push(
      `Weekly completion (${weeklyCompletion}%) looks tight versus your scheduled load. Trimming busy days or nudging weekday hours down may reduce backlog guilt.`,
    )
  }

  for (const c of horizonCompletions ?? []) {
    const row = sessById.get(c.session_id)
    if (!row || c.perceived_effort == null) continue
    const pe = Number(c.perceived_effort)
    const mins = Number(c.minutes_completed ?? 0)
    const practiced =
      row.session_type.endsWith('_practice') || row.session_type === 'sjt_practice'
    if (practiced && pe >= 4 && mins >= row.duration_minutes * 0.85) {
      insights.push(
        `Recent blocks felt tiring (rated ${pe}/5) while you nailed most planned minutes. If that keeps up, shave an hour mid-week or reclaim a slower weekend pace.`,
      )
      break
    }
  }

  const sessionsWithCompletion = (sessions ?? []).map((s) => {
    const c = completionsBySession.get(s.id)
    return {
      ...s,
      completed: completionsBySession.has(s.id),
      completed_minutes: c?.minutes ?? null,
      perceived_effort: c?.perceived ?? null,
    }
  }) as SessionWithCompletion[]

  return {
    sessions: sessionsWithCompletion,
    planDay: (planDay as DBPlanDay) ?? null,
    planId: plan.id,
    examDate: plan.exam_date,
    streak,
    weeklyCompletion,
    todayDate: today,
    insights: insights.length > 0 ? insights : undefined,
  }
}

export async function loadPlanCalendar(studentId: string, plan: DBPlan) {
  const { data: planDays, error: daysErr } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_date')
  if (daysErr) throw new Error(daysErr.message)

  const { data: sessions, error: sessErr } = await supabase
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_date')
    .order('position')
  if (sessErr) throw new Error(sessErr.message)

  const sessionIds = (sessions ?? []).map((s) => s.id)
  const { data: completions } =
    sessionIds.length > 0
      ? await supabase
          .from('session_completions')
          .select('session_id, minutes_completed, perceived_effort')
          .eq('student_id', studentId)
          .in('session_id', sessionIds)
      : { data: [] }

  const { data: extraStudyLogs } = await supabase
    .from('extra_study_logs')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('student_id', studentId)

  const completionsBySession = new Map(
    (completions ?? []).map((c) => [
      c.session_id,
      {
        minutes: c.minutes_completed as number,
        perceived: (c.perceived_effort ?? null) as number | null,
      },
    ]),
  )

  return {
    plan,
    planDays: (planDays ?? []) as DBPlanDay[],
    sessions: (sessions ?? []).map((s) => {
      const c = completionsBySession.get(s.id)
      return {
        ...s,
        completed: completionsBySession.has(s.id),
        completed_minutes: c?.minutes ?? null,
        perceived_effort: c?.perceived ?? null,
      }
    }) as SessionWithCompletion[],
    extraStudyLogs: extraStudyLogs ?? [],
    todayDate: toISODate(new Date()),
  }
}

export async function loadMockScores(plan: DBPlan) {
  const { data: mockScores, error } = await supabase
    .from('mock_scores')
    .select('*')
    .eq('plan_id', plan.id)
    .order('logged_date')
  if (error) throw new Error(error.message)

  return {
    planId: plan.id,
    mockScores: (mockScores ?? []) as DBMockScore[],
    initialTargetTotal: plan.mock_target_total ?? null,
    initialTargetSjtBand: plan.mock_target_sjt_band ?? null,
  }
}

export async function loadReflect(planId: string) {
  const { data: reflections, error: refErr } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('plan_id', planId)
    .order('week_number')
  if (refErr) throw new Error(refErr.message)

  const { data: planWeeks, error: weekErr } = await supabase
    .from('plan_weeks')
    .select('week_number, week_start, is_locked')
    .eq('plan_id', planId)
    .order('week_number')
  if (weekErr) throw new Error(weekErr.message)

  return {
    planId,
    reflections: (reflections ?? []) as DBWeeklyReflection[],
    planWeeks: (planWeeks ?? []) as Pick<DBPlanWeek, 'week_number' | 'week_start' | 'is_locked'>[],
  }
}
