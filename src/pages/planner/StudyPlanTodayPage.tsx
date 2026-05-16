import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { TodayView } from '@/components/today/today-view'
import { GuestTodayPage } from '@/components/guest/guest-today-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import { useCloudPlannerLoad } from '../../planner/hooks/useCloudPlannerLoad'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'
import PlannerLoadError from '../../planner/components/PlannerLoadError'
import type { DBPlan } from '../../planner/embedded/types'

type TodayPayload = Record<string, unknown>

function CloudTodayView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()

  const loadToday = useCallback(async (plan: DBPlan, userId: string): Promise<TodayPayload> => {
    const { loadTodayDashboard, loadPlanCalendar } = await import(
      '../../planner/lib/load-planner-data'
    )
    const [dash, cal] = await Promise.all([
      loadTodayDashboard(userId, plan),
      loadPlanCalendar(userId, plan),
    ])
    return {
      ...(dash as object),
      plan,
      plannerPdf: {
        plan: cal.plan,
        planDays: cal.planDays,
        sessions: cal.sessions,
        todayDate: cal.todayDate,
      },
      hoursSuggestion: cal.hoursSuggestion ?? null,
    }
  }, [])

  const load = useCloudPlannerLoad(user?.id, refreshTick, loadToday)

  if (load.status === 'no-plan') return <Navigate to="/study-plan" replace />
  if (load.status === 'error' && !load.data) {
    return <PlannerLoadError message={load.message} onRetry={load.retry} />
  }
  if (load.status === 'loading' && !load.data) return <PlannerLoading />
  if (!load.data) return <PlannerLoading />

  const payload = load.data
  return (
    <TodayView
      key={`${String(payload.todayDate)}-${Array.isArray(payload.sessions) ? (payload.sessions as { id: string; completed?: unknown }[]).map((s) => `${s.id}:${String(s.completed)}`).join('|') : ''}`}
      {...payload}
    />
  )
}

export default function StudyPlanTodayPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <PlannerPageLayout showSubNav={false}>
        <PlannerLoading />
      </PlannerPageLayout>
    )
  }

  if (!user) {
    if (!hasGuestPlanner()) return <Navigate to="/study-plan" replace />
    return (
      <PlannerPageLayout>
        <GuestTodayPage />
      </PlannerPageLayout>
    )
  }

  return (
    <PlannerPageLayout>
      <CloudTodayView />
    </PlannerPageLayout>
  )
}
