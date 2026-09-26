import { useEffect, useState, type ComponentProps } from 'react'
import { MockScoresView } from '@/components/plan/mock-scores-view'
import { GuestScoresPage } from '@/components/guest/guest-scores-page'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import { useCloudPlannerRefresh } from '../../planner/hooks/useCloudPlannerRefresh'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import PlannerLoading from '../../planner/components/PlannerLoading'
import MockScoresBrowseView from '../../planner/components/MockScoresBrowseView'
import MockScoresPageShell from '../../planner/components/MockScoresPageShell'
import SEOHead from '../../components/seo/SEOHead'
import { getSiteBaseUrl } from '../../lib/siteUrl'

function MockScoresSEO() {
  const base = getSiteBaseUrl()
  return (
    <SEOHead
      title="Free UCAT Mock Score Tracker (UK)"
      description="Log your UCAT full and mini mock scores, set section targets and see your trend over time. Free, with your scores saved across devices."
      canonicalUrl={base ? `${base}/mock-scores` : undefined}
      breadcrumbs={base ? [{ name: 'Home', url: `${base}/` }, { name: 'Mock scores', url: `${base}/mock-scores` }] : undefined}
    />
  )
}

function CloudMockScoresView() {
  const { user } = useAuth()
  const userId = user?.id
  const refreshTick = useCloudPlannerRefresh()
  const [data, setData] = useState<ComponentProps<typeof MockScoresView> | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setData(null)
    setLoadError(false)
    const timer = window.setTimeout(() => {
      if (!cancelled) setLoadError(true)
    }, 12000)
    void import('../../planner/lib/load-planner-data').then(async ({ ensureActivePlanForMocks, loadMockScores }) => {
      const plan = await ensureActivePlanForMocks(userId)
      if (cancelled) return
      const loaded = await loadMockScores(plan)
      if (!cancelled) setData(loaded)
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      window.clearTimeout(timer)
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [userId, refreshTick])

  if (loadError) {
    if (hasGuestPlanner()) {
      return <GuestScoresPage />
    }
    return <MockScoresBrowseView loadError />
  }
  if (!data) return <PlannerLoading />

  return <MockScoresView {...data} />
}

export default function MockScoresPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <PlannerPageLayout showCourseBanner={false}>
        <MockScoresSEO />
        <PlannerLoading />
      </PlannerPageLayout>
    )
  }

  if (!user) {
    return (
      <PlannerPageLayout showCourseBanner={false}>
        <MockScoresSEO />
        <MockScoresPageShell>
          {hasGuestPlanner() ? <GuestScoresPage /> : <MockScoresBrowseView />}
        </MockScoresPageShell>
      </PlannerPageLayout>
    )
  }

  return (
    <PlannerPageLayout showCourseBanner={false}>
      <MockScoresSEO />
      <MockScoresPageShell>
        <CloudMockScoresView />
      </MockScoresPageShell>
    </PlannerPageLayout>
  )
}
