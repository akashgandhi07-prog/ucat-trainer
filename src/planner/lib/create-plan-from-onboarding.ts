import type { OnboardingState } from '../embedded/types'
import { generateFullPlan, planToDBRows, type PlanInputs } from '../embedded/lib/plan-engine'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import { generateSlug, parseDate, toISODate } from '../embedded/lib/utils'
import { supabase } from '../../lib/supabase'
import {
  isWithinUcatExamWindow,
  normaliseExamDateIso,
} from '../../lib/ucatExamWindow'
import { invalidateActivePlanCache } from './load-planner-data'

export type CreatePlanFromOnboardingInput = {
  state: OnboardingState
  inviteToken?: string
}

/** Vite trainer: create plan rows directly via Supabase (signed-in users). */
export async function createPlanFromOnboarding({
  state,
  inviteToken,
}: CreatePlanFromOnboardingInput): Promise<void> {
  if (!state.examDate || state.hasPriorExperience === null) {
    throw new Error('Incomplete onboarding')
  }

  const examIso = normaliseExamDateIso(state.examDate)
  if (!examIso || !isWithinUcatExamWindow(examIso)) {
    throw new Error(
      'Exam date must be within the official UCAT sitting dates for this cycle.',
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in required to save your plan to the cloud')

  const examDate = parseDate(examIso)
  const inputs: PlanInputs = {
    planId: '',
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

  let tutorId: string | undefined
  if (inviteToken?.trim()) {
    const { data: tutorFromInvite, error: inviteErr } = await supabase.rpc('consume_student_invite', {
      p_token: inviteToken.trim(),
    })
    if (inviteErr) throw new Error(inviteErr.message)
    if (!tutorFromInvite) {
      throw new Error(
        'Invite link was invalid or has already been used. Ask your tutor for a new link.',
      )
    }
    tutorId = tutorFromInvite as string
  }

  await supabase
    .from('plans')
    .update({ status: 'archived' })
    .eq('student_id', user.id)
    .eq('status', 'active')

  const slug = generateSlug()
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      slug,
      student_id: user.id,
      tutor_id: tutorId ?? null,
      exam_date: toISODate(examDate),
      exam_time: state.examTime,
      current_situation: state.currentSituation,
      school_year: state.schoolYear,
      has_prior_experience: state.hasPriorExperience,
      confidence_vr: state.confidence.vr,
      confidence_dm: state.confidence.dm,
      confidence_qr: state.confidence.qr,
      confidence_sjt: state.confidence.sjt,
      rest_days: state.restDays,
      school_day_hours: state.schoolDayHours,
      weekend_hours: state.weekendHours,
      holiday_periods: state.holidayPeriods,
      ucat_sen: state.ucatSen,
    })
    .select()
    .single()

  if (planError || !plan) {
    throw new Error(planError?.message ?? 'Plan creation failed')
  }

  const generated = generateFullPlan({ ...inputs, planId: plan.id })
  const { planWeeks, planDays, sessions } = planToDBRows(generated, plan.id, state.ucatSen)

  const { error: weeksErr } = await supabase.from('plan_weeks').insert(planWeeks)
  if (weeksErr) throw new Error(weeksErr.message)
  const { error: daysErr } = await supabase.from('plan_days').insert(planDays)
  if (daysErr) throw new Error(daysErr.message)
  const { error: sessErr } = await supabase.from(PLAN_TIMETABLE_TABLE).insert(sessions)
  if (sessErr) throw new Error(sessErr.message)

  await supabase.from('plan_members').insert({ plan_id: plan.id, user_id: user.id, role: 'student' })
  if (tutorId) {
    await supabase.from('plan_members').insert({ plan_id: plan.id, user_id: tutorId, role: 'tutor' })
  }

  invalidateActivePlanCache(user.id)
}
