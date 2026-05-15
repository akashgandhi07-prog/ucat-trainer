import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { NavSidebar } from '@/components/nav-sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  await ensureProfileForUser(sb, user)

  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile) redirect('/onboarding')
  if (profile.planner_role === 'tutor') redirect('/tutor')

  // Check if plan exists
  const { data: plan } = await sb
    .from('plans')
    .select('id, slug')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  return (
    <div className="flex min-h-screen">
      <NavSidebar user={profile} planSlug={plan.slug} />
      <main className="flex-1 min-w-0 bg-slate-50">
        {children}
      </main>
    </div>
  )
}
