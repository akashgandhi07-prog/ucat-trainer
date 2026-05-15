import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateFutureWeeks } from '@/lib/db'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const fromWeekNumber = Number(body.fromWeekNumber)

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }
    if (!Number.isInteger(fromWeekNumber) || fromWeekNumber < 1) {
      return NextResponse.json(
        { error: 'fromWeekNumber must be a positive integer' },
        { status: 400 },
      )
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    await regenerateFutureWeeks(planId, fromWeekNumber)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
