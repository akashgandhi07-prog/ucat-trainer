import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { updateDayAvailability, regenerateFutureWeeks } from '@/lib/db'
import { weekNumberForCalendarDate } from '@/lib/week-for-plan-date'

async function resolveWeekNumberForDate(
  sb: Awaited<ReturnType<typeof createClient>>,
  planId: string,
  dayDate: string,
): Promise<number | null> {
  const { data: weeks } = await sb
    .from('plan_weeks')
    .select('week_number, week_start')
    .eq('plan_id', planId)
  return weekNumberForCalendarDate(weeks ?? [], dayDate)
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const dayDate = typeof body.dayDate === 'string' ? body.dayDate : ''
    const availability = body.availability as string | undefined
    const customHours =
      body.customHours === null || body.customHours === undefined || body.customHours === ''
        ? null
        : Number(body.customHours)

    if (!planId || !dayDate) {
      return NextResponse.json({ error: 'planId and dayDate are required' }, { status: 400 })
    }
    if (availability !== 'available' && availability !== 'reduced' && availability !== 'unavailable') {
      return NextResponse.json({ error: 'Invalid availability' }, { status: 400 })
    }
    if (availability === 'reduced' && customHours != null && (!Number.isFinite(customHours) || customHours <= 0)) {
      return NextResponse.json({ error: 'customHours must be a positive number when set' }, { status: 400 })
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan' },
        { status: gate.status },
      )
    }

    await updateDayAvailability(
      planId,
      dayDate,
      availability,
      availability === 'reduced' ? customHours : null,
    )

    const weekNum = await resolveWeekNumberForDate(sb, planId, dayDate)
    if (weekNum != null) {
      try {
        await regenerateFutureWeeks(planId, weekNum)
      } catch (e) {
        console.error('regenerateFutureWeeks after day update', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
