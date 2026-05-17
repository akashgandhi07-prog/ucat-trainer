import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateFutureWeeks } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { weekId } = await params
    const body = await request.json()
    const customHours = body.customHours === null ? null : Number(body.customHours)

    const { data: week } = await sb.from('plan_weeks').select('plan_id, week_number').eq('id', weekId).maybeSingle()
    if (!week) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

    const { data: plan } = await sb.from('plans').select('student_id').eq('id', week.plan_id).maybeSingle()
    if (!plan || plan.student_id !== user.id) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    if (customHours !== null && (customHours < 0.5 || customHours > 12)) {
      return NextResponse.json({ error: 'Hours must be between 0.5 and 12' }, { status: 400 })
    }

    await sb.from('plan_weeks').update({ default_hours: customHours }).eq('id', weekId)
    await regenerateFutureWeeks(week.plan_id, week.week_number)

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}
