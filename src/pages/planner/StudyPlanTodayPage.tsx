import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { TodayView } from '@/components/today/today-view'
import { GuestTodayPage } from '@/components/guest/guest-today-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'

type TodayPayload = {
  sessions: Array<Record<string, unknown>>
  planDay: Record<string, unknown> | null
  planId: string
  examDate: string
  streak: number
  weeklyCompletion: number
  todayDate: string
  insights?: string[]
}

function CloudTodayView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()
  const [payload, setPayload] = useState<TodayPayload | null>(null)
  const [missingPlan, setMissingPlan] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setPayload(null)
    void import('../../planner/lib/load-planner-data').then(async ({ fetchActivePlan, loadTodayDashboard }) => {
      const plan = await fetchActivePlan(user.id)
      if (cancelled) return
      if (!plan) {
        setMissingPlan(true)
        return
      }
      setMissingPlan(false)
      const data = await loadTodayDashboard(user.id, plan)
      if (!cancelled) setPayload(data as unknown as TodayPayload)
    }).catch(() => {
      if (!cancelled) setMissingPlan(true)
    })
    return () => {
      cancelled = true
    }
  }, [user, refreshTick])

  if (missingPlan) return <Navigate to="/study-plan" replace />
  if (!payload) return <PlannerLoading />

  return (
    <TodayView
      key={payload.sessions.map((s) => `${String(s.id)}:${String(s.completed)}`).join('|')}
      {...(payload as object)}
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
