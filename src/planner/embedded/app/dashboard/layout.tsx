import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { NavSidebar } from '@/components/nav-sidebar'
import { GuestDashboardShell } from '@/components/guest/guest-dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const embedded = (await cookies()).get('trainer_embed')?.value === '1'
  const embedMain = (
    <main className="flex-1 min-w-0 bg-slate-50 h-full overflow-auto">{children}</main>
  )

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    if (embedded) return embedMain
    return <GuestDashboardShell>{children}</GuestDashboardShell>
  }

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

  if (embedded) return embedMain

  return (
    <div className="flex min-h-screen">
      <NavSidebar user={profile} planSlug={plan.slug} />
      <main className="flex-1 min-w-0 bg-slate-50">
        {children}
      </main>
    </div>
  )
}
