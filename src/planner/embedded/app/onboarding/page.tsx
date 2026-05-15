import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import OnboardingClient from './onboarding-client'

type PageProps = { searchParams: Promise<{ invite?: string }> }

export default async function OnboardingPage({ searchParams }: PageProps) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const params = await searchParams
  const invite = typeof params.invite === 'string' ? params.invite : undefined

  if (!user) {
    return <OnboardingClient initialInviteToken={invite} />
  }

  await ensureProfileForUser(sb, user)

  const { data: profile } = await sb
    .from('profiles')
    .select('planner_role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-50 px-4">
        <p className="text-slate-700 font-medium">Completing setup…</p>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Your account is finishing syncing. Refresh this page in a moment.
        </p>
      </div>
    )
  }

  if (profile.planner_role === 'tutor') redirect('/tutor')

  const { data: activePlan } = await sb
    .from('plans')
    .select('id')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (activePlan) redirect('/dashboard')

  return <OnboardingClient initialInviteToken={invite} />
}
