import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import OnboardingClient from '@/app/onboarding/onboarding-client'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import PlannerLoading from '../../planner/components/PlannerLoading'

export default function StudyPlanPage() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [cloudReady, setCloudReady] = useState<boolean | null>(null)
  const inviteToken =
    searchParams.get('invite') ?? sessionStorage.getItem('planner_invite_token') ?? undefined

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setCloudReady(false)
      return
    }
    let cancelled = false
    import('../../planner/lib/load-planner-data').then(({ fetchActivePlan }) =>
      fetchActivePlan(user.id),
    )
      .then((plan) => {
        if (!cancelled) setCloudReady(!!plan)
      })
      .catch(() => {
        if (!cancelled) setCloudReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  if (authLoading || (user && cloudReady === null)) {
    return <PlannerLoading />
  }

  if (hasGuestPlanner() || cloudReady) {
    return <Navigate to="/study-plan/today" replace />
  }

  return <OnboardingClient initialInviteToken={inviteToken} />
}
