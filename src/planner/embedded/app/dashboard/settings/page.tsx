import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsView } from '@/components/settings/settings-view'
import { GuestReflectPage } from '@/components/guest/guest-reflect-page'
import type { TimeAwayPeriod, DateRange } from '@/types'

export default async function SettingsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <GuestReflectPage />

  const { data: plan } = await sb
    .from('plans')
    .select('id, exam_date, exam_time, rest_days, ucat_sen, holiday_periods')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  // Load busy periods from plan_days
  const { data: busyDays } = await sb
    .from('plan_days')
    .select('day_date')
    .eq('plan_id', plan.id)
    .eq('is_rest', true)
    .eq('availability', 'unavailable')
    .order('day_date')

  // Collapse contiguous busy dates into ranges
  const busyDates = (busyDays ?? []).map(d => d.day_date).sort()
  const busyRanges: DateRange[] = []
  for (const date of busyDates) {
    const last = busyRanges[busyRanges.length - 1]
    if (last) {
      const lastEnd = new Date(last.end)
      lastEnd.setDate(lastEnd.getDate() + 1)
      if (lastEnd.toISOString().slice(0, 10) === date) {
        last.end = date
        continue
      }
    }
    busyRanges.push({ start: date, end: date })
  }

  const rawHolidays: DateRange[] = Array.isArray(plan.holiday_periods) ? plan.holiday_periods as DateRange[] : []
  const timeAwayPeriods: TimeAwayPeriod[] = [
    ...rawHolidays.map(p => ({ ...p, kind: 'holiday' as const })),
    ...busyRanges.map(p => ({ ...p, kind: 'busy' as const })),
  ].sort((a, b) => a.start.localeCompare(b.start))

  return (
    <SettingsView
      planId={plan.id}
      examDate={plan.exam_date}
      examTime={plan.exam_time ?? null}
      ucatSen={plan.ucat_sen ?? false}
      timeAwayPeriods={timeAwayPeriods}
    />
  )
}
