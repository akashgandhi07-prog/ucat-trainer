import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasTutorPlanMembership } from '@/lib/api-plan-guard'
import { PlanView } from '@/components/plan/plan-view'
import { MockScoresView } from '@/components/plan/mock-scores-view'
import { toISODate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TutorNoteForm } from '@/components/tutor/tutor-note-form'
import { PLAN_TIMETABLE_TABLE } from '@/lib/planner-db-tables'
import type { DBSession, DBWeeklyReflection } from '@/types'

interface PageProps {
  params: Promise<{ planId: string }>
}

export default async function TutorStudentPage({ params }: PageProps) {
  const { planId } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  if (!(await hasTutorPlanMembership(sb, planId, user.id))) notFound()

  const { data: plan } = await sb
    .from('plans')
    .select(`*, student:profiles!plans_student_id_fkey(*)`)
    .eq('id', planId)
    .single()

  if (!plan) notFound()

  const student =
    plan.student && typeof plan.student === 'object'
      ? plan.student as { full_name: string | null; email: string | null }
      : null

  const [
    { data: planWeeks },
    { data: planDays },
    { data: sessions },
    { data: mockScores },
    { data: reflections },
  ] = await Promise.all([
    sb.from('plan_weeks').select('*').eq('plan_id', planId).order('week_number'),
    sb.from('plan_days').select('*').eq('plan_id', planId).order('day_date'),
    sb.from(PLAN_TIMETABLE_TABLE).select('*').eq('plan_id', planId).order('day_date').order('position'),
    sb.from('mock_scores').select('*').eq('plan_id', planId).order('logged_date'),
    sb.from('weekly_reflections').select('*').eq('plan_id', planId).order('week_number'),
  ])

  // Completions for this student
  const sessionIds = (sessions ?? []).map((s: DBSession) => s.id)
  const { data: completions } = sessionIds.length > 0
    ? await sb
        .from('session_completions')
        .select('session_id')
        .eq('student_id', plan.student_id)
        .in('session_id', sessionIds)
    : { data: [] as { session_id: string }[] }

  const completedIds = new Set((completions ?? []).map((c) => c.session_id))

  return (
    <div className="space-y-0">
      {/* Student header */}
      <div className="bg-white border-b border-border px-6 md:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-lg">
              {(student?.full_name || student?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {student?.full_name || 'Student'}
              </h1>
              <p className="text-muted-foreground">{student?.email ?? ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reflections */}
      {reflections && reflections.length > 0 && (
        <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Weekly Reflections</h2>
          <div className="space-y-3">
            {reflections.map((r: DBWeeklyReflection) => (
              <Card key={r.id}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Week {r.week_number}</CardTitle>
                    <span className="text-xs text-slate-400">
                      Rating: {r.difficulty_rating === 1 ? '😓 Too hard' : r.difficulty_rating === 2 ? '😊 About right' : '🚀 Too easy'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="py-0 pb-4">
                  <p className="text-sm text-slate-600 italic">"{r.reflection_text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tutor notes per week */}
      <TutorNoteForm planWeeks={planWeeks ?? []} planId={planId} />

      {/* Plan view */}
      <PlanView
        plan={plan}
        planWeeks={planWeeks ?? []}
        planDays={planDays ?? []}
        sessions={(sessions ?? []).map((s: DBSession) => ({ ...s, completed: completedIds.has(s.id) }))}
        canEdit={true}
        readOnly={false}
        todayDate={toISODate(new Date())}
      />

      {/* Mock scores */}
      <div className="border-t border-border">
        <MockScoresView
          planId={planId}
          mockScores={mockScores ?? []}
          readOnly={true}
          initialTargetTotal={plan.mock_target_total ?? null}
          initialTargetSjtBand={plan.mock_target_sjt_band ?? null}
        />
      </div>
    </div>
  )
}
