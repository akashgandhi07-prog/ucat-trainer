import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { TodayView } from '@/components/today/today-view'
import { GuestTodayPage } from '@/components/guest/guest-today-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'

type TodayPayload = Record<string, unknown>

function CloudTodayView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()
  const [payload, setPayload] = useState<TodayPayload | null>(null)
  const [missingPlan, setMissingPlan] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setPayload(null)
    void import('../../planner/lib/load-planner-data').then(
      async ({ fetchActivePlan, loadTodayDashboard, loadPlanCalendar }) => {
      const plan = await fetchActivePlan(user.id)
      if (cancelled) return
      if (!plan) {
        setMissingPlan(true)
        return
      }
      setMissingPlan(false)
      const [dash, cal] = await Promise.all([
        loadTodayDashboard(user.id, plan),
        loadPlanCalendar(user.id, plan),
      ])
      if (cancelled) return
      setPayload({
        ...(dash as object),
        plan,
        plannerPdf: {
          plan: cal.plan,
          planDays: cal.planDays,
          sessions: cal.sessions,
          todayDate: cal.todayDate,
        },
        hoursSuggestion: cal.hoursSuggestion ?? null,
      })
    },
    ).catch(() => {
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
      key={`${String(payload.todayDate)}-${Array.isArray(payload.sessions) ? (payload.sessions as { id: string; completed?: unknown }[]).map((s) => `${s.id}:${String(s.completed)}`).join('|') : ''}`}
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
