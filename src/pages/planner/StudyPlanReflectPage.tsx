import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ReflectView } from '@/components/plan/reflect-view'
import { GuestReflectPage } from '@/components/guest/guest-reflect-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'

function CloudReflectView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [missingPlan, setMissingPlan] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setData(null)
    void import('../../planner/lib/load-planner-data').then(async ({ fetchActivePlan, loadReflect }) => {
      const plan = await fetchActivePlan(user.id)
      if (cancelled) return
      if (!plan) {
        setMissingPlan(true)
        return
      }
      setMissingPlan(false)
      const loaded = await loadReflect(plan.id)
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

  return <ReflectView {...(data as object)} />
}

export default function StudyPlanReflectPage() {
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
        <GuestReflectPage />
      </PlannerPageLayout>
    )
  }

  return (
    <PlannerPageLayout>
      <CloudReflectView />
    </PlannerPageLayout>
  )
}
