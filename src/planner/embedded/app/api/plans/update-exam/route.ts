import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { updateExamDateTime } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { planId, examDate, examTime } = body

    if (!planId || !examDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 404 ? 'Plan not found' : 'Forbidden' },
        { status: gate.status },
      )
    }

    await updateExamDateTime(planId, examDate, examTime ?? null, body.ucatSen)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
