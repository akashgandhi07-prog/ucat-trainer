import type { OnboardingState } from '@/types'
import type { GuestPlannerBundle } from '@/lib/guest-planner-store'
import { generateFullPlan, planToDBRows, type PlanInputs } from '@/lib/plan-engine'
import { generateSlug, parseDate, toISODate } from '@/lib/utils'
import {
  isWithinUcatExamWindow,
  normaliseExamDateIso,
} from '@/lib/ucatExamWindow'
import type { DBPlan, DBPlanDay, DBPlanWeek, DBSession } from '@/types'

function stamp<T extends Record<string, unknown>>(row: T, now: string): T & { created_at: string; updated_at: string } {
  return { ...row, created_at: now, updated_at: now } as T & { created_at: string; updated_at: string }
}

/** Build a full guest plan in memory (localStorage only until the user signs in). */
export function buildGuestPlannerFromOnboarding(state: OnboardingState): GuestPlannerBundle {
  if (!state.examDate || state.hasPriorExperience === null) {
    throw new Error('Incomplete onboarding')
  }

  const examIso = normaliseExamDateIso(state.examDate)
  if (!examIso || !isWithinUcatExamWindow(examIso)) {
    throw new Error(
      'Exam date must be within the official UCAT sitting dates for this cycle.',
    )
  }

  const planId = crypto.randomUUID()
  const now = new Date().toISOString()
  const examDate = parseDate(examIso)

  const inputs: PlanInputs = {
    planId,
    examDate,
    hasPriorExperience: state.hasPriorExperience,
    confidence: state.confidence,
    schoolDayHours: state.schoolDayHours,
    weekendHours: state.weekendHours,
    holidayPeriods: state.holidayPeriods,
    restDays: state.restDays,
    busyPeriods: state.busyPeriods,
    ucatSen: state.ucatSen,
  }

  const generated = generateFullPlan(inputs)
  const { planWeeks, planDays, sessions } = planToDBRows(generated, planId, state.ucatSen)

  const plan: DBPlan = {
    id: planId,
    slug: generateSlug(),
    student_id: 'guest',
    tutor_id: null,
    exam_date: toISODate(examDate),
    exam_time: state.examTime,
    current_situation: state.currentSituation,
    school_year: state.schoolYear,
    school_day_hours: state.schoolDayHours,
    weekend_hours: state.weekendHours,
    holiday_periods: state.holidayPeriods,
    has_prior_experience: state.hasPriorExperience,
    confidence_vr: state.confidence.vr,
    confidence_dm: state.confidence.dm,
    confidence_qr: state.confidence.qr,
    confidence_sjt: state.confidence.sjt,
    rest_days: state.restDays,
    ucat_sen: state.ucatSen,
    status: 'active',
    mock_target_total: null,
    mock_target_sjt_band: null,
    created_at: now,
    updated_at: now,
  }

  return {
    plan,
    planWeeks: planWeeks.map((w) => stamp(w, now)) as DBPlanWeek[],
    planDays: planDays.map((d) => stamp(d, now)) as DBPlanDay[],
    sessions: sessions.map((s) => stamp(s, now)) as DBSession[],
    completions: [],
    mockScores: [],
  }
}
