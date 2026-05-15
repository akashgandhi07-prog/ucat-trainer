import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateFutureWeeks } from '@/lib/db'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'

const REFLECTION_MAX = 8000

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const weekNumber = Number(body.weekNumber)
    const reflectionText =
      typeof body.reflectionText === 'string' ? body.reflectionText.trim() : ''
    const difficultyRating = Number(body.difficultyRating)

    if (!planId) {
      return NextResponse.json({ error: 'planId is required' }, { status: 400 })
    }
    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      return NextResponse.json({ error: 'weekNumber must be a positive integer' }, { status: 400 })
    }
    if (!reflectionText) {
      return NextResponse.json({ error: 'reflectionText is required' }, { status: 400 })
    }
    if (reflectionText.length > REFLECTION_MAX) {
      return NextResponse.json(
        { error: `reflectionText must be at most ${REFLECTION_MAX} characters` },
        { status: 400 },
      )
    }
    if (![1, 2, 3].includes(difficultyRating)) {
      return NextResponse.json(
        { error: 'difficultyRating must be 1, 2, or 3' },
        { status: 400 },
      )
    }

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      const msg = gate.status === 404 ? 'Plan not found' : 'Not allowed to update this plan'
      return NextResponse.json({ error: msg }, { status: gate.status })
    }

    const { data, error } = await sb
      .from('weekly_reflections')
      .upsert(
        {
          plan_id: planId,
          student_id: gate.studentId,
          week_number: weekNumber,
          reflection_text: reflectionText,
          difficulty_rating: difficultyRating,
        },
        { onConflict: 'plan_id,week_number' },
      )
      .select()
      .single()

    if (error) throw error

    try {
      await regenerateFutureWeeks(planId, weekNumber + 1)
    } catch (regenErr) {
      console.error('regenerateFutureWeeks after reflection', regenErr)
    }

    return NextResponse.json({ reflection: data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
