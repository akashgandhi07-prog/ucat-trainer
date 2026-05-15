import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateFutureWeeks } from '@/lib/db'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { weekNumberForCalendarDate } from '@/lib/week-for-plan-date'

const SECTION_KEYS = new Set(['vr', 'dm', 'qr', 'sjt'])

function bumpPracticeConfidence(cur: number): number {
  const n = Number.isFinite(cur) ? Math.round(cur) : 3
  const clamped = Math.min(5, Math.max(1, n))
  return Math.max(1, clamped - 1)
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const fromDate = typeof body.fromDate === 'string' ? body.fromDate : ''
    const schoolDayHours = Number(body.schoolDayHours)
    const weekendHours = Number(body.weekendHours)
    const needsMoreRaw = Array.isArray(body.needsMore) ? body.needsMore : []
    const needsMore = needsMoreRaw.filter((x: unknown): x is string => typeof x === 'string')

    if (!planId || !fromDate) {
      return NextResponse.json({ error: 'planId and fromDate are required' }, { status: 400 })
    }

    if (
      !Number.isFinite(schoolDayHours) ||
      !Number.isFinite(weekendHours) ||
      schoolDayHours < 0.5 ||
      schoolDayHours > 12 ||
      weekendHours < 0.5 ||
      weekendHours > 12
    ) {
      return NextResponse.json(
        { error: 'schoolDayHours and weekendHours must be between 0.5 and 12' },
        { status: 400 },
      )
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    const { data: planRow } = await sb
      .from('plans')
      .select('confidence_vr, confidence_dm, confidence_qr, confidence_sjt')
      .eq('id', planId)
      .maybeSingle()

    if (!planRow) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const patch: Record<string, unknown> = {
      school_day_hours: schoolDayHours,
      weekend_hours: weekendHours,
    }

    const adjusted: string[] = []
    for (const key of needsMore) {
      if (!SECTION_KEYS.has(key)) continue
      const col =
        key === 'vr'
          ? 'confidence_vr'
          : key === 'dm'
            ? 'confidence_dm'
            : key === 'qr'
              ? 'confidence_qr'
              : 'confidence_sjt'
      const prev = planRow[col as keyof typeof planRow] as number
      const next = bumpPracticeConfidence(prev)
      patch[col] = next
      if (next !== prev) adjusted.push(key.toUpperCase())
    }

    const { error: upErr } = await sb.from('plans').update(patch).eq('id', planId)
    if (upErr) throw upErr

    const { data: weeks } = await sb
      .from('plan_weeks')
      .select('week_number, week_start')
      .eq('plan_id', planId)

    const weekNum = weekNumberForCalendarDate(weeks ?? [], fromDate)
    if (weekNum == null) {
      return NextResponse.json(
        { error: 'Could not match fromDate to a week in this plan' },
        { status: 400 },
      )
    }

    await regenerateFutureWeeks(planId, weekNum)

    const warnings: string[] = []
    if (adjusted.length > 0) {
      warnings.push(
        `Practice emphasis increased for ${adjusted.join(', ')} (confidence nudged toward more scheduled time).`,
      )
    }

    return NextResponse.json({ success: true, warnings })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
