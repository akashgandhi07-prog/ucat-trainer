import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const btnPrimary =
  'inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
const btnSecondary =
  'inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'

type PageProps = { params: Promise<{ token: string }> }

export default async function JoinViaInvitePage({ params }: PageProps) {
  const { token } = await params

  const sb = await createClient()
  const { data: tokenOk, error: rpcError } = await sb.rpc('student_invite_token_valid', {
    p_token: token,
  })

  const valid = rpcError ? false : Boolean(tokenOk)

  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite link unavailable</CardTitle>
            <CardDescription>
              This link is invalid or has already been used. Ask your tutor for a fresh invite URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login" className={cn(btnSecondary, 'inline-flex w-auto')}>
              Sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: { user } } = await sb.auth.getUser()

  if (user) {
    await ensureProfileForUser(sb, user)

    const { data: profile } = await sb.from('profiles').select('planner_role').eq('id', user.id).maybeSingle()

    if (profile?.planner_role === 'tutor') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center px-4 py-16">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Student invite link</CardTitle>
              <CardDescription>
                This link is for students joining a tutor. Open it in the student&apos;s browser, or switch to your student account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href="/tutor" className={cn(btnPrimary, 'w-auto')}>
                Go to tutor dashboard
              </Link>
            </CardContent>
          </Card>
        </div>
      )
    }

    const { data: activePlan } = await sb
      .from('plans')
      .select('id')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (activePlan) {
      redirect('/dashboard')
    }

    redirect(`/onboarding?invite=${encodeURIComponent(token)}`)
  }

  const inviteQuery = `/auth/login?invite=${encodeURIComponent(token)}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-foreground" />
            </div>
            UCAT Planner
          </div>
          <p className="text-sm text-muted-foreground">You&apos;ve been invited by your tutor</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your revision plan</CardTitle>
            <CardDescription>
              Sign in or sign up with your email; no password needed. Your tutor will see progress once your plan is set up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Use this same device browser when you tap the magic link from your email. That keeps your invite connected to your account.
            </p>
            <Link href={inviteQuery} className={btnPrimary}>
              Continue with email
            </Link>
            <p className="text-xs text-slate-400 text-center">
              Share only this invite page with yourself. It&apos;s your personal onboarding link from your tutor.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
