import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import OnboardingClient, {
  type OnboardingProfilePrefill,
} from '@/app/onboarding/onboarding-client'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import { useAuth } from '../../hooks/useAuth'
import PlannerLoading from '../../planner/components/PlannerLoading'
import PlannerPageLayout from '../../planner/PlannerPageLayout'
import type { AuthState } from '../../types/session'

function buildOnboardingPrefill(
  user: AuthState['user'],
  profile: AuthState['profile'],
): OnboardingProfilePrefill | undefined {
  if (!user) return undefined

  const fromProfile = profile?.full_name?.trim()
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const first = (meta?.first_name as string | undefined)?.trim()
  const last = (meta?.last_name as string | undefined)?.trim()
  const fromMeta =
    (first && last ? `${first} ${last}` : first) ||
    (meta?.full_name as string | undefined)?.trim() ||
    (meta?.name as string | undefined)?.trim() ||
    null

  return {
    fullName: fromProfile || fromMeta,
    examDate: profile?.ucat_exam_date ?? null,
  }
}

export default function StudyPlanPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [cloudReady, setCloudReady] = useState<boolean | null>(null)
  const inviteToken =
    searchParams.get('invite') ?? sessionStorage.getItem('planner_invite_token') ?? undefined

  const profilePrefill = useMemo(
    () => buildOnboardingPrefill(user, profile),
    [user, profile],
  )

  const userId = user?.id
  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setCloudReady(false)
      return
    }
    let cancelled = false
    // Hard fallback: if the fetch never resolves (e.g. network issue + cancelled race),
    // stop the loading spinner so the user isn't stuck forever. The cleanup also clears this.
    const timer = window.setTimeout(() => {
      if (!cancelled) setCloudReady(false)
    }, 25_000)
    import('../../planner/lib/load-planner-data')
      .then(({ fetchActivePlan, isMocksOnlyPlaceholderPlan }) =>
        fetchActivePlan(userId).then((plan) => {
          if (!cancelled) {
            window.clearTimeout(timer)
            setCloudReady(!!plan && !isMocksOnlyPlaceholderPlan(plan))
          }
        }),
      )
      .catch(() => {
        if (!cancelled) {
          window.clearTimeout(timer)
          setCloudReady(false)
        }
      })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [userId, authLoading])

  if (authLoading || (user && cloudReady === null)) {
    return (
      <PlannerPageLayout showSubNav={false} showGuestBanner={false} showCourseBanner={false}>
        <PlannerLoading />
      </PlannerPageLayout>
    )
  }

  if (hasGuestPlanner() || cloudReady) {
    return <Navigate to="/study-plan/plan" replace />
  }

  return (
    <PlannerPageLayout showSubNav={false} showGuestBanner={false} showCourseBanner={false}>
      <OnboardingClient initialInviteToken={inviteToken} profilePrefill={profilePrefill} />
    </PlannerPageLayout>
  )
}
