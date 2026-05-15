import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { createPlan } from '@/lib/db'
import { PlanInputs } from '@/lib/plan-engine'

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureProfileForUser(sb, user)

    const body = await request.json()

    const examRaw = body.examDate
    if (!examRaw) {
      return NextResponse.json({ error: 'examDate is required' }, { status: 400 })
    }
    const examDate = new Date(examRaw)
    if (Number.isNaN(examDate.getTime())) {
      return NextResponse.json({ error: 'Invalid examDate' }, { status: 400 })
    }

    const inputs: PlanInputs = {
      planId: '',
      examDate,
      hasPriorExperience: Boolean(body.hasPriorExperience),
      confidence: {
        vr: Number(body.confidence?.vr),
        dm: Number(body.confidence?.dm),
        qr: Number(body.confidence?.qr),
        sjt: Number(body.confidence?.sjt),
      },
      schoolDayHours: Number(body.schoolDayHours) || 2,
      weekendHours: Number(body.weekendHours) || 4,
      holidayPeriods: Array.isArray(body.holidayPeriods) ? body.holidayPeriods : [],
      restDays: Array.isArray(body.restDays) ? body.restDays : [],
      busyPeriods: Array.isArray(body.busyPeriods) ? body.busyPeriods : [],
      ucatSen: Boolean(body.ucatSen),
    }

    for (const key of ['vr', 'dm', 'qr', 'sjt'] as const) {
      const n = inputs.confidence[key]
      if (!Number.isFinite(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: `confidence.${key} must be between 1 and 5` }, { status: 400 })
      }
    }

    let tutorFromInvite: string | undefined

    if (typeof body.inviteToken === 'string' && body.inviteToken.trim()) {
      const { data: tutorId, error: inviteRpcError } = await sb.rpc('consume_student_invite', {
        p_token: body.inviteToken.trim(),
      })
      if (inviteRpcError) {
        return NextResponse.json({ error: inviteRpcError.message }, { status: 400 })
      }
      if (!tutorId) {
        return NextResponse.json(
          {
            error:
              'Invite link was invalid or has already been used. Ask your tutor for a new link.',
          },
          { status: 400 },
        )
      }
      tutorFromInvite = tutorId as string
    }

    const plan = await createPlan(
      inputs,
      user.id,
      tutorFromInvite,
      typeof body.examTime === 'string' ? body.examTime : null,
      typeof body.currentSituation === 'string' ? body.currentSituation : null,
      typeof body.schoolYear === 'string' ? body.schoolYear : null,
    )

    return NextResponse.json({ plan })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Plan creation failed'
    console.error('Plan creation error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
