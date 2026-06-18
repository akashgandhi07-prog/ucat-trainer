import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { regenerateFutureWeeks } from '@/lib/db'
import { weekNumberForCalendarDate } from '@/lib/week-for-plan-date'
import { toISODate } from '@/lib/utils'

function parseTargetTotal(val: unknown): { ok: true; value: number | null } | { ok: false; message: string } {
  if (val === null || val === undefined || val === '') return { ok: true, value: null }
  const n = Number(val)
  if (!Number.isInteger(n) || n < 900 || n > 2700) {
    return { ok: false, message: 'mockTargetTotal must be null or an integer from 900 to 2700' }
  }
  return { ok: true, value: n }
}

function parseTargetSjt(val: unknown): { ok: true; value: number | null } | { ok: false; message: string } {
  if (val === null || val === undefined || val === '') return { ok: true, value: null }
  const n = Number(val)
  if (!Number.isInteger(n) || n < 1 || n > 4) {
    return { ok: false, message: 'mockTargetSjtBand must be null or an integer from 1 to 4' }
  }
  return { ok: true, value: n }
}

export async function PATCH(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 })

    if (!('mockTargetTotal' in body) || !('mockTargetSjtBand' in body)) {
      return NextResponse.json(
        { error: 'mockTargetTotal and mockTargetSjtBand are required (use null to clear)' },
        { status: 400 },
      )
    }

    const parsedTotal = parseTargetTotal(body.mockTargetTotal)
    const parsedSjt = parseTargetSjt(body.mockTargetSjtBand)
    if (!parsedTotal.ok) return NextResponse.json({ error: parsedTotal.message }, { status: 400 })
    if (!parsedSjt.ok) return NextResponse.json({ error: parsedSjt.message }, { status: 400 })

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan' },
        { status: gate.status },
      )
    }

    const { data: updated, error } = await sb
      .from('plans')
      .update({
        mock_target_total: parsedTotal.value,
        mock_target_sjt_band: parsedSjt.value,
      })
      .eq('id', planId)
      .select(
        'id, mock_target_total, mock_target_sjt_band, slug, student_id, exam_date, status',
      )
      .single()

    if (error) throw error

    // Targets feed gap-to-goal weighting + intensity; rebuild upcoming weeks.
    try {
      const { data: weeks } = await sb
        .from('plan_weeks')
        .select('week_number, week_start')
        .eq('plan_id', planId)
      const currentWeek = weekNumberForCalendarDate(weeks ?? [], toISODate(new Date()))
      if (currentWeek != null) await regenerateFutureWeeks(planId, currentWeek + 1)
    } catch (regenErr) {
      console.error('regenerateFutureWeeks after mock target', regenErr)
    }

    return NextResponse.json({ plan: updated })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
