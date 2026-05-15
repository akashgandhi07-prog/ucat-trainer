import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { parseDate, weeksUntil } from '@/lib/utils'
import Link from 'next/link'

export default async function TutorOverviewPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

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

  const students = (members ?? []).map((m: any) => m.plan).filter(Boolean)

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tutor Overview</h1>
        <p className="text-slate-500 mt-1">Manage all your students' revision plans</p>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">👩‍🎓</div>
          <h2 className="text-xl font-semibold text-slate-700">No students yet</h2>
          <p className="text-slate-500 mt-2 mb-6">Invite a student to get started.</p>
          <Link
            href="/tutor/invite"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Invite student
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {students.map((plan: any) => {
            const weeksLeft = weeksUntil(parseDate(plan.exam_date))
            const st = plan.student
            const label = st?.full_name || st?.email?.split('@')[0] || 'Student'
            return (
              <Link key={plan.id} href={`/tutor/student/${plan.id}`}>
                <Card className="hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {label}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">{st?.email ?? ''}</p>
                      </div>
                      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                        weeksLeft <= 3 ? 'bg-red-50 text-red-600' :
                        weeksLeft <= 6 ? 'bg-amber-50 text-amber-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {weeksLeft}w left
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-slate-600">
                      Exam: {parseDate(plan.exam_date).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
