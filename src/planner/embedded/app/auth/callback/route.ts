import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone()
  const code = url.searchParams.get('code')
  const inviteToken = url.searchParams.get('invite_token')

  if (code) {
    const sb = await createClient()
    const { data, error } = await sb.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      await ensureProfileForUser(sb, data.user)

      // Check if user already has a plan
      const { data: plan } = await sb
        .from('plans')
        .select('id')
        .eq('student_id', data.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { data: profile } = await sb
        .from('profiles')
        .select('planner_role')
        .eq('id', data.user.id)
        .maybeSingle()

      let pathname = '/dashboard'
      if (profile?.planner_role === 'tutor') {
        pathname = '/tutor'
      } else if (plan) {
        pathname = '/dashboard'
      } else {
        pathname = '/onboarding'
      }

      url.pathname = pathname
      url.search = ''
      if (pathname === '/onboarding' && inviteToken) {
        url.searchParams.set('invite', inviteToken)
      }
      return NextResponse.redirect(url)
    }
  }

  url.pathname = '/auth/login'
  url.searchParams.set('error', 'Authentication failed')
  return NextResponse.redirect(url)
}
