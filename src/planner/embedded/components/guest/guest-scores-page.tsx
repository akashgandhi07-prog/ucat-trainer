'use client'

import { MockScoresView } from '@/components/plan/mock-scores-view'
import { getGuestPlanner } from '@/lib/guest-planner-store'
import MockScoresBrowseView from '../../../components/MockScoresBrowseView'

export function GuestScoresPage() {
  const bundle = getGuestPlanner()
  if (!bundle) {
    return <MockScoresBrowseView />
  }

  return (
    <MockScoresView
      guestMode
      planId={bundle.plan.id}
      mockScores={bundle.mockScores}
      initialTargetTotal={bundle.plan.mock_target_total ?? null}
      initialTargetSjtBand={bundle.plan.mock_target_sjt_band ?? null}
    />
  )
}
