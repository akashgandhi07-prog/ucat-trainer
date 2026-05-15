import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INVITE_RATE_WINDOW_MS = 60 * 60 * 1000
const INVITE_RATE_MAX = 25

/** Best-effort per-process throttle (multiple server instances each enforce their own window). */
const tutorInviteTimestamps = new Map<string, number[]>()

function isInviteRateLimited(tutorUserId: string): boolean {
  const now = Date.now()
  const windowStart = now - INVITE_RATE_WINDOW_MS
  const prev = tutorInviteTimestamps.get(tutorUserId) ?? []
  const recent = prev.filter((t) => t > windowStart)
  if (recent.length >= INVITE_RATE_MAX) {
    tutorInviteTimestamps.set(tutorUserId, recent)
    return true
  }
  recent.push(now)
  tutorInviteTimestamps.set(tutorUserId, recent)
  return false
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await sb
      .from('profiles')
      .select('planner_role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.planner_role !== 'tutor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const rawEmail =
      typeof body === 'object' &&
      body !== null &&
      'studentEmail' in body &&
      (body as Record<string, unknown>).studentEmail != null
        ? String((body as Record<string, unknown>).studentEmail).trim()
        : ''

    if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
      return NextResponse.json({ error: 'Enter a valid student email address.' }, { status: 400 })
    }

    const normalizedEmail = rawEmail.toLowerCase()

    if (user.email && normalizedEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Use your student account email, not your tutor email.' },
        { status: 400 },
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[tutor/invite] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Invite is temporarily unavailable.' }, { status: 503 })
    }

    if (isInviteRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Too many invites sent from this account. Try again later.' },
        { status: 429 },
      )
    }

    const adminSb = createAdminClient(supabaseUrl, serviceRoleKey)

    const { data: studentRow } = await adminSb
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (studentRow?.id) {
      const { data: plan } = await adminSb
        .from('plans')
        .select('id')
        .eq('student_id', studentRow.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (plan?.id) {
        const { error: memberErr } = await adminSb.from('plan_members').upsert(
          {
            plan_id: plan.id,
            user_id: user.id,
            role: 'tutor',
          },
          { onConflict: 'plan_id,user_id' },
        )
        if (memberErr) {
          console.error('[tutor/invite] plan_members upsert failed', memberErr)
          return NextResponse.json({ error: 'Could not link to that student plan.' }, { status: 500 })
        }
        const { error: planErr } = await adminSb
          .from('plans')
          .update({ tutor_id: user.id })
          .eq('id', plan.id)
        if (planErr) {
          console.error('[tutor/invite] plans tutor_id update failed', planErr)
          return NextResponse.json({ error: 'Could not link to that student plan.' }, { status: 500 })
        }
      }
    }

    const requestUrl = new URL(request.url)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl.origin

    const { error: inviteErr } = await adminSb.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { role: 'student', invited_by_tutor: user.id },
      redirectTo: `${appUrl}/auth/callback`,
    })

    if (inviteErr) {
      console.error('[tutor/invite] inviteUserByEmail failed', inviteErr)
      return NextResponse.json({ error: 'Could not send invite. Try again later.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error('[tutor/invite] unexpected error', e)
    return NextResponse.json({ error: 'Could not send invite. Try again later.' }, { status: 500 })
  }
}
