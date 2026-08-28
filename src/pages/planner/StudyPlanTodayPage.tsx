import { useCallback, type ComponentProps } from 'react'
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

type TodayPayload = ComponentProps<typeof TodayView>

/** How long Today waits for the PDF/hours extras before rendering without them. */
const CALENDAR_EXTRAS_TIMEOUT_MS = 6_000

function CloudTodayView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()

  const loadToday = useCallback(async (plan: DBPlan, userId: string): Promise<TodayPayload> => {
    const { loadTodayDashboard, loadPlanCalendar } = await import(
      '../../planner/lib/load-planner-data'
    )
    // The calendar pulls every day, session and completion in the plan, but Today
    // needs it only for the PDF export button and the hours hint. It used to be
    // awaited alongside the dashboard inside one 12s budget, so on a slow
    // connection the whole page failed to load however often students refreshed.
    // Give it its own shorter budget and carry on without it if it misses.
    const calendar = Promise.race([
      loadPlanCalendar(userId, plan).catch(() => null),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), CALENDAR_EXTRAS_TIMEOUT_MS)),
    ])
    const [dash, cal] = await Promise.all([loadTodayDashboard(userId, plan), calendar])
    return {
      ...dash,
      plan,
      plannerPdf: cal
        ? {
            plan: cal.plan,
            planDays: cal.planDays,
            sessions: cal.sessions,
            todayDate: cal.todayDate,
          }
        : null,
      hoursSuggestion: cal?.hoursSuggestion ?? null,
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
