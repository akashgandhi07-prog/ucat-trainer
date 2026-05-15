import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { APP_CONTENT_WIDTH, APP_CONTENT_X } from '../lib/appContentLayout'
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      {showSubNav ? <PlannerSubNav /> : null}
      {showGuestBanner && hasGuestPlanner() ? (
        <div className={cn(APP_CONTENT_X, APP_CONTENT_WIDTH, 'pt-3 shrink-0')}>
          <GuestSignInCta />
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  )
}
