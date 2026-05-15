import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TodayView } from '@/components/today/today-view'
import { toISODate } from '@/lib/utils'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'

export default async function DashboardPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = toISODate(new Date())

  // Load plan
  const { data: plan } = await sb
    .from('plans')
    .select('*')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  // Today's sessions
  const { data: sessions } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('*')
    .eq('plan_id', plan.id)
    .eq('day_date', today)
    .order('position')

  // Today's plan_day
  const { data: planDay } = await sb
    .from('plan_days')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('day_date', today)
    .maybeSingle()

  // Completions for today
  const sessionIds = (sessions ?? []).map((s: any) => s.id)
  const { data: completions } = sessionIds.length > 0
    ? await sb
        .from('session_completions')
        .select('session_id, minutes_completed, perceived_effort')
        .eq('student_id', user.id)
        .in('session_id', sessionIds)
    : { data: [] }

  const completionsBySession = new Map(
    (completions ?? []).map((c: any) => [
      c.session_id,
      { minutes: c.minutes_completed as number, perceived: (c.perceived_effort ?? null) as number | null },
    ]),
  )

  // Weekly progress
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0,0,0,0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { data: weekSessions } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('id')
    .eq('plan_id', plan.id)
    .gte('day_date', toISODate(weekStart))
    .lte('day_date', toISODate(weekEnd))
    .not('session_type', 'eq', 'rest')

  const weekSessionIds = (weekSessions ?? []).map((s: any) => s.id)
  const { data: weekCompletions } = weekSessionIds.length > 0
    ? await sb
        .from('session_completions')
        .select('id')
        .eq('student_id', user.id)
        .in('session_id', weekSessionIds)
    : { data: [] }

  const weeklyCompletion = weekSessions?.length
    ? Math.round(((weekCompletions?.length ?? 0) / weekSessions.length) * 100)
    : 0

  // Streak
  const { data: recentCompletions } = await sb
    .from('session_completions')
    .select(`${PLAN_TIMETABLE_TABLE}!inner(day_date)`)
    .eq('student_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(200)

  const datesWithActivity = new Set<string>()
  for (const row of (recentCompletions ?? []) as any[]) {
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
  const horizonIso = toISODate(horizonStart)

  const { data: horizonSessions } = await sb
    .from(PLAN_TIMETABLE_TABLE)
    .select('id, day_date, duration_minutes, session_type')
    .eq('plan_id', plan.id)
    .gte('day_date', horizonIso)

  const horizonIds = (horizonSessions ?? []).map((s: { id: string }) => s.id)
  const sessById = new Map((horizonSessions ?? []).map((s: any) => [s.id as string, s]))

  const { data: horizonCompletions } = horizonIds.length > 0
    ? await sb
        .from('session_completions')
        .select('session_id, minutes_completed, perceived_effort')
        .eq('student_id', user.id)
        .in('session_id', horizonIds)
    : { data: [] }

  const planDatesWithWork = new Set<string>()
  for (const c of horizonCompletions ?? []) {
    const row = sessById.get((c as any).session_id)
    if (!row || (c as any).minutes_completed <= 0) continue
    planDatesWithWork.add((row as { day_date: string }).day_date)
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
    const row = sessById.get((c as any).session_id) as
      | { day_date: string; duration_minutes: number; session_type: string }
      | undefined
    if (!row || (c as any).perceived_effort == null) continue
    const pe = Number((c as any).perceived_effort)
    const mins = Number((c as any).minutes_completed ?? 0)
    const practiced =
      row.session_type.endsWith('_practice') || row.session_type === 'sjt_practice'
    if (practiced && pe >= 4 && mins >= row.duration_minutes * 0.85) {
      insights.push(
        `Recent blocks felt tiring (rated ${pe}/5) while you nailed most planned minutes. If that keeps up, shave an hour mid-week or reclaim a slower weekend pace.`,
      )
      break
    }
  }

  const sessionsWithCompletion = (sessions ?? []).map((s: any) => {
    const c = completionsBySession.get(s.id)
    return {
      ...s,
      completed: completionsBySession.has(s.id),
      completed_minutes: c?.minutes ?? null,
      perceived_effort: c?.perceived ?? null,
    }
  })

  return (
    <TodayView
      key={sessionsWithCompletion.map(s => `${s.id}:${Number(s.completed)}:${s.completed_minutes ?? ''}:${s.perceived_effort ?? ''}`).join('|')}
      sessions={sessionsWithCompletion}
      planDay={planDay}
      planId={plan.id}
      examDate={plan.exam_date}
      streak={streak}
      weeklyCompletion={weeklyCompletion}
      todayDate={today}
      insights={insights.length > 0 ? insights : undefined}
    />
  )
}
