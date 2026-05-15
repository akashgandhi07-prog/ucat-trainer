import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId, completed, minutesCompleted, perceivedEffort } = await request.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const { data: sessionRow, error: sessionErr } = await sb
      .from(PLAN_TIMETABLE_TABLE)
      .select('id, plan_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (sessionErr) throw sessionErr
    if (!sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const gate = await requireStudentOrTutorPlan(sb, sessionRow.plan_id, user.id)
    if (!gate.ok) {
      const msg =
        gate.status === 404 ? 'Plan not found for this timetable slot' : 'Not allowed to update this session'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    if (completed) {
      const parsedMinutes = Number(minutesCompleted)
      if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
        return NextResponse.json({ error: 'minutesCompleted must be a non-negative number' }, { status: 400 })
      }
      let pe: number | null = null
      if (perceivedEffort !== undefined && perceivedEffort !== null && perceivedEffort !== '') {
        const raw = Number(perceivedEffort)
        if (!Number.isFinite(raw)) {
          return NextResponse.json({ error: 'perceivedEffort must be between 1 and 5 when set' }, { status: 400 })
        }
        const rounded = Math.round(raw)
        if (rounded < 1 || rounded > 5) {
          return NextResponse.json({ error: 'perceivedEffort must be between 1 and 5' }, { status: 400 })
        }
        pe = rounded
      }
      const { error: upErr } = await sb
        .from('session_completions')
        .upsert(
          {
            session_id: sessionId,
            student_id: gate.studentId,
            minutes_completed: Math.round(parsedMinutes),
            perceived_effort: pe,
          },
          { onConflict: 'session_id,student_id' },
        )
      if (upErr) throw upErr
    } else {
      const { error: delErr } = await sb.from('session_completions')
        .delete()
        .eq('session_id', sessionId)
        .eq('student_id', gate.studentId)
      if (delErr) throw delErr
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
