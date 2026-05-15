import { supabase } from '../../lib/supabase'
import { hasTutorPlanMembership } from '../embedded/lib/api-plan-guard'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import type { DBSession, DBWeeklyReflection } from '../embedded/types'

export async function loadTutorStudentPlan(tutorId: string, planId: string) {
  const allowed = await hasTutorPlanMembership(supabase, planId, tutorId)
  if (!allowed) return null

  const { data: plan } = await supabase
    .from('plans')
    .select(`*, student:profiles!plans_student_id_fkey(*)`)
    .eq('id', planId)
    .single()

  if (!plan) return null

  const [
    { data: planWeeks },
    { data: planDays },
    { data: sessions },
    { data: mockScores },
    { data: reflections },
  ] = await Promise.all([
    supabase.from('plan_weeks').select('*').eq('plan_id', planId).order('week_number'),
    supabase.from('plan_days').select('*').eq('plan_id', planId).order('day_date'),
    supabase
      .from(PLAN_TIMETABLE_TABLE)
      .select('*')
      .eq('plan_id', planId)
      .order('day_date')
      .order('position'),
    supabase.from('mock_scores').select('*').eq('plan_id', planId).order('logged_date'),
    supabase.from('weekly_reflections').select('*').eq('plan_id', planId).order('week_number'),
  ])

  const sessionIds = (sessions ?? []).map((s: DBSession) => s.id)
  const { data: completions } =
    sessionIds.length > 0
      ? await supabase
          .from('session_completions')
          .select('session_id')
          .eq('student_id', plan.student_id)
          .in('session_id', sessionIds)
      : { data: [] as { session_id: string }[] }

  const completedIds = new Set((completions ?? []).map((c) => c.session_id))

  return {
    plan,
    planWeeks: planWeeks ?? [],
    planDays: planDays ?? [],
    sessions: (sessions ?? []).map((s: DBSession) => ({
      ...s,
      completed: completedIds.has(s.id),
    })),
    mockScores: mockScores ?? [],
    reflections: (reflections ?? []) as DBWeeklyReflection[],
  }
}
