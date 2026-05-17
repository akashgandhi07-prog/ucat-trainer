import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ReflectView } from '@/components/plan/reflect-view'
import { GuestReflectPage } from '@/components/guest/guest-reflect-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import PlannerLoadError from '../../planner/components/PlannerLoadError'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'

function CloudReflectView() {
  const { user } = useAuth()
  const userId = user?.id
  const refreshTick = useCloudPlannerRefresh()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [missingPlan, setMissingPlan] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setData(null)
    setLoadError(false)
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoadError(true)
    }, 12000)
    void import('../../planner/lib/load-planner-data').then(async ({ fetchActivePlan, loadReflect, isMocksOnlyPlaceholderPlan }) => {
      const plan = await fetchActivePlan(userId)
      if (cancelled) return
      if (!plan || isMocksOnlyPlaceholderPlan(plan)) {
        setMissingPlan(true)
        return
      }
      setMissingPlan(false)
      const loaded = await loadReflect(plan.id)
      if (!cancelled) setData(loaded as Record<string, unknown>)
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      window.clearTimeout(timer)
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [userId, refreshTick, retryKey])

  if (missingPlan) return <Navigate to="/study-plan" replace />
  if (loadError) return <PlannerLoadError message="Could not load your reflections. Check your connection and try again." onRetry={() => setRetryKey((k) => k + 1)} />
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
