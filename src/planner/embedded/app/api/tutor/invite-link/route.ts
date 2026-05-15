import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function makeToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function POST(request: Request) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await sb
      .from('profiles')
      .select('planner_role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.planner_role !== 'tutor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const token = makeToken()

    const { error } = await sb.from('student_invite_links').insert({
      token,
      tutor_id: user.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const requestUrl = new URL(request.url)
    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
      `${requestUrl.protocol}//${requestUrl.host}`

    const inviteUrl = `${appOrigin}/join/${token}`

    return NextResponse.json({ token, inviteUrl })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
