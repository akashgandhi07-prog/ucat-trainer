import { useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { PlanCalendar } from '@/components/plan/plan-calendar'
import { GuestPlanPage } from '@/components/guest/guest-plan-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import { useCloudPlannerLoad } from '../../planner/hooks/useCloudPlannerLoad'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'
import PlannerLoadError from '../../planner/components/PlannerLoadError'
import type { DBPlan } from '../../planner/embedded/types'

function CloudPlanView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()

  const loadPlan = useCallback(async (plan: DBPlan, userId: string) => {
    const { loadPlanCalendar } = await import('../../planner/lib/load-planner-data')
    return loadPlanCalendar(userId, plan)
  }, [])

  const load = useCloudPlannerLoad(user?.id, refreshTick, loadPlan)

  if (load.status === 'no-plan') return <Navigate to="/study-plan" replace />
  if (load.status === 'error' && !load.data) {
    return <PlannerLoadError message={load.message} onRetry={load.retry} />
  }
  if (load.status === 'loading' && !load.data) return <PlannerLoading />
  if (!load.data) return <PlannerLoading />

  return <PlanCalendar {...(load.data as object)} />
}

export default function StudyPlanPlanPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <PlannerPageLayout>
        <PlannerLoading />
      </PlannerPageLayout>
    )
  }

  if (!user) {
    if (!hasGuestPlanner()) return <Navigate to="/study-plan" replace />
    return (
      <PlannerPageLayout>
        <GuestPlanPage />
      </PlannerPageLayout>
    )
  }

  return (
    <PlannerPageLayout>
      <CloudPlanView />
    </PlannerPageLayout>
  )
}
