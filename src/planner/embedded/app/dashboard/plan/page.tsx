import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlanCalendar } from '@/components/plan/plan-calendar'
import { GuestPlanPage } from '@/components/guest/guest-plan-page'
import { toISODate } from '@/lib/utils'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'

export default async function PlanPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <GuestPlanPage />

  const { data: plan } = await sb
    .from('plans')
    .select('*')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  const { data: planDays } = await sb
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_date')

  const { data: planWeeks } = await sb
    .from('plan_weeks')
    .select('*')
    .eq('plan_id', plan.id)
    .order('week_number')

  const { data: sessions } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', plan.id)
    .order('day_date')
    .order('position')

  const { data: completions } = await sb
    .from('session_completions')
    .select('session_id, minutes_completed, perceived_effort')
    .eq('student_id', user.id)
    .in('session_id', (sessions ?? []).map((s: any) => s.id))

  const { data: extraStudyLogs } = await sb
    .from('extra_study_logs')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('student_id', user.id)

  const completionsBySession = new Map(
    (completions ?? []).map((c: any) => [
      c.session_id,
      { minutes: c.minutes_completed as number, perceived: (c.perceived_effort ?? null) as number | null },
    ]),
  )

  return (
    <PlanCalendar
      plan={plan}
      planDays={planDays ?? []}
      planWeeks={planWeeks ?? []}
      sessions={(sessions ?? []).map((s: any) => {
        const c = completionsBySession.get(s.id)
        return {
          ...s,
          completed: completionsBySession.has(s.id),
          completed_minutes: c?.minutes ?? null,
          perceived_effort: c?.perceived ?? null,
        }
      })}
      extraStudyLogs={extraStudyLogs ?? []}
      todayDate={toISODate(new Date())}
    />
  )
}
