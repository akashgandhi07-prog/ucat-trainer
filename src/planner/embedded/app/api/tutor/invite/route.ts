import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

    const { studentEmail } = await request.json()
    if (!studentEmail) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Check if student already has an account and link them
    const { data: student } = await sb
      .from('profiles')
      .select('id')
      .eq('email', studentEmail.trim())
      .maybeSingle()

    if (student) {
      const { data: plan } = await sb
        .from('plans')
        .select('id')
        .eq('student_id', student.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (plan) {
        await sb.from('plan_members').upsert({
          plan_id: plan.id,
          user_id: user.id,
          role: 'tutor',
        }, { onConflict: 'plan_id,user_id' })
        await sb.from('plans').update({ tutor_id: user.id }).eq('id', plan.id)
      }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    const requestUrl = new URL(request.url)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? requestUrl.origin

    // Use service role client to send invite email
    const adminSb = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await adminSb.auth.admin.inviteUserByEmail(studentEmail, {
      data: { role: 'student', invited_by_tutor: user.id },
      redirectTo: `${appUrl}/auth/callback`,
    })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
