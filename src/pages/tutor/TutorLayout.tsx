import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { TutorSidebar } from '@/components/tutor/tutor-sidebar'
import { useAuth } from '../../hooks/useAuth'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { fetchTutorStudents, isPlannerTutor } from '../../planner/lib/tutor-api'
import type { TutorStudentPlan } from '../../planner/lib/tutor-api'
import PlannerLoading from '../../planner/components/PlannerLoading'

export default function TutorLayout() {
  const { user, loading, profile } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [students, setStudents] = useState<TutorStudentPlan[]>([])
  const [tutorOk, setTutorOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let cancelled = false
    void (async () => {
      const ok = await isPlannerTutor(user.id)
      if (cancelled) return
      if (!ok) {
        setTutorOk(false)
        return
      }
      setTutorOk(true)
      const list = await fetchTutorStudents(user.id)
      if (!cancelled) setStudents(list)
    })().catch(() => {
      if (!cancelled) setTutorOk(false)
    })
    return () => {
      cancelled = true
    }
  }, [user, loading])

  if (loading) {
    return <PlannerLoading />
  }

  if (!user) {
    openAuthModal('login')
    return <Navigate to="/" replace />
  }

  if (tutorOk === null) {
    return <PlannerLoading />
  }

  if (!tutorOk) {
    return <Navigate to="/dashboard" replace />
  }

  const tutorProfile = {
    id: user.id,
    email: user.email ?? null,
    full_name: profile?.full_name ?? null,
    planner_role: 'tutor' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <div className="flex min-h-0 flex-1 w-full">
      <TutorSidebar tutor={tutorProfile} students={students} />
      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <Outlet />
      </main>
    </div>
  )
}
