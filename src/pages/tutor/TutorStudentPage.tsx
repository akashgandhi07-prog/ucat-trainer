import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { PlanView } from '@/components/plan/plan-view'
import { MockScoresView } from '@/components/plan/mock-scores-view'
import { TutorNoteForm } from '@/components/tutor/tutor-note-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toISODate } from '../../planner/lib/date-utils'
import { useAuth } from '../../hooks/useAuth'
import PlannerLoading from '../../planner/components/PlannerLoading'
type TutorStudentData = NonNullable<
  Awaited<ReturnType<typeof import('../../planner/lib/load-tutor-student').loadTutorStudentPlan>>
>

export default function TutorStudentPage() {
  const { planId } = useParams<{ planId: string }>()
  const { user } = useAuth()
  const [data, setData] = useState<TutorStudentData | null | undefined>(undefined)

  useEffect(() => {
    if (!user || !planId) return
    let cancelled = false
    void import('../../planner/lib/load-tutor-student').then(({ loadTutorStudentPlan }) =>
      loadTutorStudentPlan(user.id, planId),
    )
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => {
      cancelled = true
    }
  }, [user, planId])

  if (!planId) return <Navigate to="/tutor" replace />
  if (data === undefined) return <PlannerLoading />
  if (!data) return <Navigate to="/tutor" replace />

  const { plan, planWeeks, planDays, sessions, mockScores, reflections } = data
  const student =
    plan.student && typeof plan.student === 'object'
      ? (plan.student as { full_name: string | null; email: string | null })
      : null

  return (
    <article className="space-y-0">
      <header className="bg-card border-b border-border px-6 md:px-10 py-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-lg">
            {(student?.full_name || student?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{student?.full_name || 'Student'}</h1>
            <p className="text-muted-foreground">{student?.email ?? ''}</p>
          </div>
        </div>
      </header>

      {reflections.length > 0 ? (
        <section className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-foreground mb-4">Weekly Reflections</h2>
          <ul className="space-y-3 list-none p-0 m-0">
            {reflections.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between gap-2">
                      <span>Week {r.week_number}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        Rating:{' '}
                        {r.difficulty_rating === 1
                          ? '😓 Too hard'
                          : r.difficulty_rating === 2
                            ? '😊 About right'
                            : '🚀 Too easy'}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                    <p className="text-sm text-muted-foreground italic">&ldquo;{r.reflection_text}&rdquo;</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <TutorNoteForm planWeeks={planWeeks} planId={planId} />

      <PlanView
        plan={plan}
        planWeeks={planWeeks}
        planDays={planDays}
        sessions={sessions}
        canEdit={true}
        readOnly={false}
        todayDate={toISODate(new Date())}
      />

      <section className="border-t border-border">
        <MockScoresView
          planId={planId}
          mockScores={mockScores}
          readOnly={true}
          initialTargetTotal={plan.mock_target_total ?? null}
          initialTargetSjtBand={plan.mock_target_sjt_band ?? null}
        />
      </section>
    </article>
  )
}
