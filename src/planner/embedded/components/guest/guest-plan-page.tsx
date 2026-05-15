'use client'

import { PlanCalendar } from '@/components/plan/plan-calendar'
import { getGuestPlanner } from '@/lib/guest-planner-store'
import { sessionsWithGuestCompletions } from '@/lib/guest-plan-helpers'
import { toISODate } from '@/lib/utils'

export function GuestPlanPage() {
  const bundle = getGuestPlanner()
  if (!bundle) return null

  const today = toISODate(new Date())

  return (
    <PlanCalendar
      plan={bundle.plan}
      planDays={bundle.planDays}
      sessions={sessionsWithGuestCompletions(bundle, bundle.sessions)}
      extraStudyLogs={[]}
      readOnly
      todayDate={today}
    />
  )
}
