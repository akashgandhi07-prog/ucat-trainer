import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { regenerateFutureWeeks } from '@/lib/db'
import { weekNumberForCalendarDate } from '@/lib/week-for-plan-date'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const dayDate = typeof body.dayDate === 'string' ? body.dayDate : ''
    const blocked = body.blocked !== false // default true

    if (!planId || !dayDate) {
      return NextResponse.json({ error: 'planId and dayDate are required' }, { status: 400 })
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    if (blocked) {
      // Upsert the day as fully unavailable
      await sb.from('plan_days').upsert(
        {
          plan_id: planId,
          day_date: dayDate,
          availability: 'unavailable' as const,
          is_rest: true,
          custom_hours: null,
        },
        { onConflict: 'plan_id,day_date' },
      )
      // Remove any sessions scheduled on that day
      await sb.from(PLAN_TIMETABLE_TABLE).delete().eq('plan_id', planId).eq('day_date', dayDate)
    } else {
      // Unblock: restore to available (delete the rest/unavailable record)
      const { data: existing } = await sb
        .from('plan_days')
        .select('id, availability')
        .eq('plan_id', planId)
        .eq('day_date', dayDate)
        .maybeSingle()

      if (existing && existing.availability === 'unavailable') {
        await sb.from('plan_days').delete().eq('id', existing.id)
      }
    }

    // Regenerate sessions from this week forward
    const { data: weeks } = await sb
      .from('plan_weeks')
      .select('week_number, week_start')
      .eq('plan_id', planId)

    const weekNum = weekNumberForCalendarDate(weeks ?? [], dayDate)
    if (weekNum != null) {
      await regenerateFutureWeeks(planId, weekNum)
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
