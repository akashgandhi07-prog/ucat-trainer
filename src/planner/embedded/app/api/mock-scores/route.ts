import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudentOrTutorPlan } from '@/lib/api-plan-guard'
import type { MockSource, MockType } from '@/types'
import { weekNumberForCalendarDate } from '@/lib/week-for-plan-date'

const SOURCES = new Set<MockSource>([
  'medify',
  'medentry',
  'passmedicine',
  'book',
  'official',
])

function parseSection300(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isInteger(n) || n < 300 || n > 900) return null
  return n
}

function parseSjt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isInteger(n) || n < 1 || n > 4) return null
  return n
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const planId = typeof body.planId === 'string' ? body.planId : ''
    const mockDate = typeof body.mockDate === 'string' ? body.mockDate : ''

    if (!planId || !mockDate) {
      return NextResponse.json({ error: 'planId and mockDate are required' }, { status: 400 })
    }

    if (body.mockType !== 'full' && body.mockType !== 'mini') {
      return NextResponse.json({ error: 'mockType must be full or mini' }, { status: 400 })
    }
    const mockType = body.mockType as MockType

    const scoreVr = parseSection300(body.scoreVr)
    const scoreDm = parseSection300(body.scoreDm)
    const scoreQr = parseSection300(body.scoreQr)
    const scoreSjt = parseSjt(body.scoreSjt)

    if (scoreVr === null && scoreDm === null && scoreQr === null && scoreSjt === null) {
      return NextResponse.json(
        { error: 'Provide at least one score (VR, DM, QR as 300-900, or SJT band 1-4)' },
        { status: 400 },
      )
    }

    if (
      (body.scoreVr !== null && body.scoreVr !== undefined && body.scoreVr !== '' && scoreVr === null) ||
      (body.scoreDm !== null && body.scoreDm !== undefined && body.scoreDm !== '' && scoreDm === null) ||
      (body.scoreQr !== null && body.scoreQr !== undefined && body.scoreQr !== '' && scoreQr === null) ||
      (body.scoreSjt !== null && body.scoreSjt !== undefined && body.scoreSjt !== '' && scoreSjt === null)
    ) {
      return NextResponse.json({ error: 'Scores must be valid integers in range' }, { status: 400 })
    }

    let mockSource: MockSource | null = null
    if (body.mockSource != null && body.mockSource !== '') {
      if (!SOURCES.has(body.mockSource as MockSource)) {
        return NextResponse.json({ error: 'Invalid mockSource' }, { status: 400 })
      }
      mockSource = body.mockSource as MockSource
    }

    const weaknessTags = Array.isArray(body.weaknessTags)
      ? body.weaknessTags.filter((t: unknown): t is string => typeof t === 'string')
      : []

    const gate = await requireStudentOrTutorPlan(sb, planId, user.id)
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 404 ? 'Plan not found' : 'Not allowed to log mock scores for this plan' },
        { status: gate.status },
      )
    }

    const { data: weeks } = await sb
      .from('plan_weeks')
      .select('week_number, week_start')
      .eq('plan_id', planId)

    const weekNumber = weekNumberForCalendarDate(weeks ?? [], mockDate)

    const { data: row, error } = await sb
      .from('mock_scores')
      .insert({
        plan_id: planId,
        student_id: gate.studentId,
        session_id: null,
        logged_date: mockDate,
        week_number: weekNumber,
        score_vr: scoreVr,
        score_dm: scoreDm,
        score_qr: scoreQr,
        score_sjt: scoreSjt,
        mock_type: mockType,
        mock_source: mockSource,
        weakness_tags: weaknessTags,
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ score: row })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
