import { useEffect, useState } from 'react'
import { Link } from '@/lib/app-link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseDate, weeksUntil } from '@/lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { fetchTutorStudents, type TutorStudentPlan } from '../../planner/lib/tutor-api'
import PlannerLoading from '../../planner/components/PlannerLoading'

export default function TutorOverviewPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<TutorStudentPlan[] | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void fetchTutorStudents(user.id)
      .then((list) => {
        if (!cancelled) setStudents(list)
      })
      .catch(() => {
        if (!cancelled) setStudents([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (!students) return <PlannerLoading />

  return (
    <section className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Tutor Overview</h1>
        <p className="text-muted-foreground mt-1">Manage all your students&apos; revision plans</p>
      </header>

      {students.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4" aria-hidden>
            👩‍🎓
          </p>
          <h2 className="text-xl font-semibold text-foreground">No students yet</h2>
          <p className="text-muted-foreground mt-2 mb-6">Invite a student to get started.</p>
          <Link
            href="/tutor/invite"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Invite student
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0 m-0">
          {students.map((plan) => {
            const weeksLeft = weeksUntil(parseDate(plan.exam_date))
            const st = plan.student
            const label = st?.full_name || st?.email?.split('@')[0] || 'Student'
            return (
              <li key={plan.id}>
                <Link href={`/tutor/student/${plan.id}`}>
                  <Card className="hover:border-border hover:shadow-sm transition-all cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-start justify-between gap-2">
                        <span>
                          {label}
                          <span className="block text-sm font-normal text-muted-foreground mt-0.5">
                            {st?.email ?? ''}
                          </span>
                        </span>
                        <span
                          className={`text-xs font-medium rounded-full px-2.5 py-1 shrink-0 ${
                            weeksLeft <= 3
                              ? 'bg-red-50 text-red-600'
                              : weeksLeft <= 6
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-green-50 text-green-600'
                          }`}
                        >
                          {weeksLeft}w left
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        Exam:{' '}
                        {parseDate(plan.exam_date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
