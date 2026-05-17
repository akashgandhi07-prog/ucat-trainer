import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId } = await params
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

    // Fetch the session to verify it exists and get the planId
    const { data: sessionRow, error: sessionErr } = await sb
      .from(PLAN_TIMETABLE_TABLE)
      .select('id, plan_id, duration_minutes')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 500 })
    if (!sessionRow) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const gate = await requireStudentOrTutorPlan(sb, sessionRow.plan_id, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    const body = await request.json()
    const completed = body.completed !== false // default true
    const minutesCompleted =
      typeof body.minutesCompleted === 'number' ? Math.max(0, Math.round(body.minutesCompleted)) : null
    const perceivedEffort =
      typeof body.perceivedEffort === 'number' ? Math.min(5, Math.max(1, Math.round(body.perceivedEffort))) : null

    if (completed) {
      const minutes = minutesCompleted ?? sessionRow.duration_minutes
      const { error } = await sb.from('session_completions').upsert(
        {
          session_id: sessionId,
          student_id: gate.studentId,
          minutes_completed: minutes,
          perceived_effort: perceivedEffort,
        },
        { onConflict: 'session_id,student_id' },
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await sb
        .from('session_completions')
        .delete()
        .eq('session_id', sessionId)
        .eq('student_id', gate.studentId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
