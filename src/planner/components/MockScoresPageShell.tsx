import type { ReactNode } from 'react'
import { PlannerExtrasAside } from '../../components/layout/ProductUpsell'
import { useAuth } from '../../hooks/useAuth'
import { getUpsellProfileContext } from '../../lib/productUpsell'

type MockScoresPageShellProps = {
  children: ReactNode
}

/** Split layout: mock tracker main column + optional extras rail (matches study-plan onboarding). */
export default function MockScoresPageShell({ children }: MockScoresPageShellProps) {
  const { user, profile } = useAuth()
  const { firstName, stream } = getUpsellProfileContext(user, profile)

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row lg:items-stretch">
      <div className="flex-1 min-w-0 overflow-y-auto">{children}</div>

      <PlannerExtrasAside
        placement="mock_scores"
        panel
        stream={stream}
        firstName={firstName}
        className="hidden lg:flex lg:w-[17.5rem] xl:w-72 shrink-0"
      />
      <PlannerExtrasAside
        placement="mock_scores"
        panel
        stream={stream}
        firstName={firstName}
        className="lg:hidden shrink-0 border-t border-border bg-muted/20"
      />
    </div>
  )
}
