import type { ReactNode } from 'react'
import PlannerSubNav from './PlannerSubNav'
import { GuestSignInCta } from './shim/guest-sign-in-cta'
import { hasGuestPlanner } from '@/lib/guest-planner-store'

type PlannerPageLayoutProps = {
  children: ReactNode
  showSubNav?: boolean
  showGuestBanner?: boolean
}

export default function PlannerPageLayout({
  children,
  showSubNav = true,
  showGuestBanner = true,
}: PlannerPageLayoutProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50">
      {showSubNav ? <PlannerSubNav /> : null}
      {showGuestBanner && hasGuestPlanner() ? (
        <div className="px-4 sm:px-6 pt-3 max-w-5xl shrink-0">
          <GuestSignInCta />
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  )
}
