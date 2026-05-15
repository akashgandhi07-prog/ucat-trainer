import { useEffect, useState } from 'react'
import { MockScoresView } from '@/components/plan/mock-scores-view'
import { GuestScoresPage } from '@/components/guest/guest-scores-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'
import MockScoresBrowseView from '../../planner/components/MockScoresBrowseView'
import MockScoresPageShell from '../../planner/components/MockScoresPageShell'

function CloudMockScoresView() {
  const { user } = useAuth()
  const refreshTick = useCloudPlannerRefresh()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [missingPlan, setMissingPlan] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setData(null)
    setMissingPlan(false)
    void import('../../planner/lib/load-planner-data').then(async ({ fetchActivePlan, loadMockScores }) => {
      const plan = await fetchActivePlan(user.id)
      if (cancelled) return
      if (!plan) {
        setMissingPlan(true)
        return
      }
      const loaded = await loadMockScores(plan)
      if (!cancelled) setData(loaded as Record<string, unknown>)
    }).catch(() => {
      if (!cancelled) setMissingPlan(true)
    })
    return () => {
      cancelled = true
    }
  }, [user, refreshTick])

  if (missingPlan) {
    if (hasGuestPlanner()) {
      return <GuestScoresPage />
    }
    return <MockScoresBrowseView signedIn />
  }
  if (!data) return <PlannerLoading />

  return <MockScoresView {...(data as object)} />
}

export default function MockScoresPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <PlannerPageLayout showCourseBanner={false}>
        <PlannerLoading />
      </PlannerPageLayout>
    )
  }

  if (!user) {
    return (
      <PlannerPageLayout showCourseBanner={false}>
        <MockScoresPageShell>
          {hasGuestPlanner() ? <GuestScoresPage /> : <MockScoresBrowseView />}
        </MockScoresPageShell>
      </PlannerPageLayout>
    )
  }

  return (
    <PlannerPageLayout showCourseBanner={false}>
      <MockScoresPageShell>
        <CloudMockScoresView />
      </MockScoresPageShell>
    </PlannerPageLayout>
  )
}
