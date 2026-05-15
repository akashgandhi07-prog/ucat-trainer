'use client'

import { Link } from '@/lib/app-link'
import { usePathname, useRouter } from '@/lib/app-navigation'
import { cn } from '@/lib/utils'
import { DBUser } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface StudentPlan {
  id: string
  slug: string
  exam_date: string
  status: string
  student: { id: string; email: string | null; full_name: string | null }
}

interface TutorSidebarProps {
  tutor: DBUser
  students: StudentPlan[]
}

export function TutorSidebar({ tutor, students }: TutorSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/tutor" className="inline-flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">UCAT Planner</span>
        </Link>
        <p className="text-xs text-slate-400 mt-1">Tutor dashboard</p>
      </div>

      {/* Students list */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 mb-2">
          Students ({students.length})
        </p>

        <Link
          href="/tutor"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/tutor'
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          <span>🏠</span> Overview
        </Link>

        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname === '/'
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          <span>🎯</span> Skills drills
        </Link>

        {students.map(plan => (
          <Link
            key={plan.id}
            href={`/tutor/student/${plan.id}`}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === `/tutor/student/${plan.id}`
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
              {(plan.student.full_name || plan.student.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate">{plan.student.full_name || plan.student.email?.split('@')[0] || 'Student'}</p>
              <p className="text-xs text-slate-400 truncate">
                Exam: {new Date(plan.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </Link>
        ))}

        {students.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            No students yet. Create a shareable invite link below.
          </div>
        )}
      </nav>

      {/* Invite */}
      <div className="px-3 pb-3">
        <Link
          href="/tutor/invite"
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Invite or share link
        </Link>
      </div>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm shrink-0">
            {(tutor.full_name || tutor.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{tutor.full_name || 'Tutor'}</p>
            <p className="text-xs text-slate-500 truncate">{tutor.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors mt-1"
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  )
}
