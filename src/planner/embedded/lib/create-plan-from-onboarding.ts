import type { OnboardingState } from '@/types'

export type CreatePlanFromOnboardingInput = {
  state: OnboardingState
  inviteToken?: string
}

/** Next.js: persists via API route (server-side createPlan). */
export async function createPlanFromOnboarding({
  state,
  inviteToken,
}: CreatePlanFromOnboardingInput): Promise<void> {
  const response = await fetch('/api/plans/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      examDate: state.examDate,
      examTime: state.examTime,
      hasPriorExperience: state.hasPriorExperience,
      confidence: state.confidence,
      currentSituation: state.currentSituation,
      schoolYear: state.schoolYear,
      schoolDayHours: state.schoolDayHours,
      weekendHours: state.weekendHours,
      holidayPeriods: state.holidayPeriods,
      restDays: state.restDays,
      busyPeriods: state.busyPeriods,
      ucatSen: state.ucatSen,
      inviteToken,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Failed to create plan',
    )
  }
}
