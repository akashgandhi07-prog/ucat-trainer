import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'

const VALID_SECTIONS = new Set(['vr', 'dm', 'qr', 'sjt'])

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { planId, dayDate, section, minutes } = await request.json()
    const parsedMinutes = Number(minutes)

    if (!planId || !dayDate || !section) {
      return NextResponse.json({ error: 'Missing planId, dayDate, or section' }, { status: 400 })
    }
    if (!VALID_SECTIONS.has(section)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
      return NextResponse.json({ error: 'Minutes must be a non-negative number' }, { status: 400 })
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    if (parsedMinutes === 0) {
      const { error } = await sb
        .from('extra_study_logs')
        .delete()
        .eq('plan_id', planId)
        .eq('student_id', gate.studentId)
        .eq('day_date', dayDate)
        .eq('section', section)
      if (error) throw error
      return NextResponse.json({ success: true, deleted: true })
    }

    const { data, error } = await sb
      .from('extra_study_logs')
      .upsert(
        {
          plan_id: planId,
          student_id: gate.studentId,
          day_date: dayDate,
          section,
          minutes: Math.round(parsedMinutes),
        },
        { onConflict: 'plan_id,student_id,day_date,section' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, extraStudy: data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
