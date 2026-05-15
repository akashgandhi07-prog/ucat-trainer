import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { APP_CONTENT_X, appContentWidthClass } from '../lib/appContentLayout'
import { useAppShell } from '../contexts/AppShellContext'
import PlannerSubNav from './PlannerSubNav'
import { GuestSignInCta } from './shim/guest-sign-in-cta'
import { hasGuestPlanner } from '@/lib/guest-planner-store'
import ProductUpsell from '../components/layout/ProductUpsell'
import { useAuth } from '../hooks/useAuth'
import { getUpsellProfileContext, hasActiveCourseUpsells } from '../lib/productUpsell'

type PlannerPageLayoutProps = {
  children: ReactNode
  showSubNav?: boolean
  showGuestBanner?: boolean
  /** Full-width course hero above content (off on study-plan onboarding). */
  showCourseBanner?: boolean
}

export default function PlannerPageLayout({
  children,
  showSubNav = true,
  showGuestBanner = true,
  /** Keep the planner focused on the timetable; course promos live in the sidebar or marketing pages. */
  showCourseBanner = false,
}: PlannerPageLayoutProps) {
  const { user, profile } = useAuth()
  const { firstName, stream } = getUpsellProfileContext(user, profile)
  const inAppShell = useAppShell()
  const contentWidth = appContentWidthClass({ inAppShell })

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
      {showSubNav ? <PlannerSubNav /> : null}
      {showGuestBanner && hasGuestPlanner() ? (
        <div className={cn(APP_CONTENT_X, contentWidth, 'pt-3 shrink-0')}>
          <GuestSignInCta />
        </div>
      ) : null}
      {showCourseBanner && hasActiveCourseUpsells() ? (
        <div className={cn(APP_CONTENT_X, contentWidth, 'pt-3 shrink-0')}>
          <ProductUpsell
            variant="hero"
            offer="course"
            placement="planner_banner"
            stream={stream}
            firstName={firstName}
            dismissible
          />
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  )
}
