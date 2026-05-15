import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { TutorSidebar } from '@/components/tutor/tutor-sidebar'

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  await ensureProfileForUser(sb, user)

  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile || profile.planner_role !== 'tutor') redirect('/dashboard')

  // Fetch all students linked to this tutor
  const { data: members } = await sb
    .from('plan_members')
    .select(`
      plan_id,
      plan:plans(
        id, slug, exam_date, status,
        student:profiles!plans_student_id_fkey(id, email, full_name)
      )
    `)
    .eq('user_id', user.id)
    .eq('role', 'tutor')

  const students = (members ?? [])
    .map((m: any) => m.plan)
    .filter(Boolean)

  return (
    <div className="flex min-h-screen">
      <TutorSidebar tutor={profile} students={students} />
      <main className="flex-1 min-w-0 bg-slate-50">
        {children}
      </main>
    </div>
  )
}
