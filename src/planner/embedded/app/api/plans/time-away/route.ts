import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { regenerateFutureWeeks } from '@/lib/db'
import { weekNumberForCalendarDate } from '@/lib/week-for-plan-date'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'
import type { TimeAwayPeriod, DateRange } from '@/types'

function eachDay(start: string, end: string): string[] {
  const days: string[] = []
  const cur = new Date(start)
  const last = new Date(end)
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const periods: TimeAwayPeriod[] = Array.isArray(body.periods) ? body.periods : []
    const regenerateFromDate = typeof body.regenerateFromDate === 'string' ? body.regenerateFromDate : null

    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 })

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    // Split into holiday (reduced hours) and busy (fully blocked)
    const holidayPeriods: DateRange[] = periods.filter(p => p.kind === 'holiday')
    const busyPeriods: DateRange[] = periods.filter(p => p.kind === 'busy')

    // Persist holiday periods on the plan row (used by plan engine for hour rates)
    await sb.from('plans').update({ holiday_periods: holidayPeriods }).eq('id', planId)

    // Compute all busy dates from busy periods
    const busyDates = new Set<string>()
    for (const p of busyPeriods) {
      for (const d of eachDay(p.start, p.end)) busyDates.add(d)
    }

    // Fetch existing rest/unavailable days for this plan
    const { data: existingBusyDays } = await sb
      .from('plan_days')
      .select('id, day_date')
      .eq('plan_id', planId)
      .eq('is_rest', true)
      .eq('availability', 'unavailable')

    const existingDates = new Set((existingBusyDays ?? []).map(d => d.day_date))
    const existingById = new Map((existingBusyDays ?? []).map(d => [d.day_date, d.id]))

    // Delete days that are no longer busy
    const toDelete = [...existingDates].filter(d => !busyDates.has(d))
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(d => existingById.get(d)!).filter(Boolean)
      if (idsToDelete.length) await sb.from('plan_days').delete().in('id', idsToDelete)
      // Restore sessions for unblocked days (delete nothing - regeneration will recreate them)
    }

    // Upsert new busy days
    const toAdd = [...busyDates].filter(d => !existingDates.has(d))
    if (toAdd.length > 0) {
      await sb.from('plan_days').upsert(
        toAdd.map(day_date => ({
          plan_id: planId,
          day_date,
          availability: 'unavailable' as const,
          is_rest: true,
          custom_hours: null,
        })),
        { onConflict: 'plan_id,day_date' },
      )
      // Remove any existing sessions on newly blocked days
      await sb.from(PLAN_TIMETABLE_TABLE).delete().eq('plan_id', planId).in('day_date', toAdd)
    }

    // Optionally regenerate future weeks from a given date
    if (regenerateFromDate) {
      const { data: weeks } = await sb
        .from('plan_weeks')
        .select('week_number, week_start')
        .eq('plan_id', planId)

      const weekNum = weekNumberForCalendarDate(weeks ?? [], regenerateFromDate)
      if (weekNum != null) {
        await regenerateFutureWeeks(planId, weekNum)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
