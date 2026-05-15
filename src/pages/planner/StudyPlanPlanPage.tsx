import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PlanCalendar } from '@/components/plan/plan-calendar'
import { GuestPlanPage } from '@/components/guest/guest-plan-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'

function CloudPlanView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [missingPlan, setMissingPlan] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setData(null)
    void import('../../planner/lib/load-planner-data').then(async ({ fetchActivePlan, loadPlanCalendar }) => {
      const plan = await fetchActivePlan(user.id)
      if (cancelled) return
      if (!plan) {
        setMissingPlan(true)
        return
      }
      setMissingPlan(false)
      const loaded = await loadPlanCalendar(user.id, plan)
      if (!cancelled) setData(loaded as Record<string, unknown>)
    }).catch(() => {
      if (!cancelled) setMissingPlan(true)
    })
    return () => {
      cancelled = true
    }
  }, [user, refreshTick])

  if (missingPlan) return <Navigate to="/study-plan" replace />
  if (!data) return <PlannerLoading />

  return (
    <PlanCalendar
      {...(data as object)}
    />
  )
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
