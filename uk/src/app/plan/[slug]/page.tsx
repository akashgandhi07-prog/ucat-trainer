import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlanView } from '@/components/plan/plan-view'
import { toISODate } from '@/lib/utils'
import Link from 'next/link'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PublicPlanPage({ params }: PageProps) {
  const { slug } = await params
  const sb = await createClient()

  const { data: plan } = await sb
    .from('plans')
    .select(`*, student:profiles!plans_student_id_fkey(full_name, email)`)
    .eq('slug', slug)
    .single()

  if (!plan) notFound()

  const studentLabel =
    plan.student && typeof plan.student === 'object'
      ? plan.student.full_name
        ? `${plan.student.full_name}'s plan`
        : 'Revision plan'
      : 'Revision plan'

  const [
    { data: planWeeks },
    { data: planDays },
    { data: sessions },
  ] = await Promise.all([
    sb.from('plan_weeks').select('*').eq('plan_id', plan.id).order('week_number'),
    sb.from('plan_days').select('*').eq('plan_id', plan.id).order('day_date'),
    sb.from(PLAN_TIMETABLE_TABLE).select('*').eq('plan_id', plan.id).order('day_date').order('position'),
  ])

  // Check if current user is logged in and is the student/tutor
  const { data: { user } } = await sb.auth.getUser()
  let canEdit = false
  if (user) {
    const { data: member } = await sb
      .from('plan_members')
      .select('role')
      .eq('plan_id', plan.id)
      .eq('user_id', user.id)
      .maybeSingle()
    canEdit = !!member
  }

  const sessionsWithCompletion = (sessions ?? []).map((s: any) => ({
    ...s,
    completed: false,  // public view never shows completion
  }))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public header banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <span className="font-bold text-slate-900 text-sm">UCAT Planner</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {studentLabel}
              {' · '}
              Read-only view
            </span>
            {canEdit ? (
              <Link
                href={user ? '/dashboard/plan' : '/auth/login'}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 rounded-lg border border-blue-200 px-3 py-1.5 hover:bg-blue-50 transition-colors"
              >
                Edit plan →
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      <PlanView
        plan={plan}
        planWeeks={planWeeks ?? []}
        planDays={planDays ?? []}
        sessions={sessionsWithCompletion}
        canEdit={false}
        readOnly={true}
        todayDate={toISODate(new Date())}
      />
    </div>
  )
}
