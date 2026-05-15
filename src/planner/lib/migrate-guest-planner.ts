import { supabase } from '../../lib/supabase'
import { fetchActivePlan, invalidateActivePlanCache } from './load-planner-data'
import {
  clearGuestPlanner,
  generateSlug,
  getGuestPlanner,
  type GuestPlannerBundle,
} from './guest-planner-io'

const PLAN_TIMETABLE_TABLE = 'plan_sessions'

function newId(): string {
  return crypto.randomUUID()
}

/** Upload a guest localStorage plan to Supabase after sign-in (if user has no active plan). */
export async function migrateGuestPlannerToCloud(studentId: string): Promise<{
  migrated: boolean
  reason?: string
}> {
  const bundle = getGuestPlanner()
  if (!bundle) return { migrated: false, reason: 'no_guest_plan' }

  const existing = await fetchActivePlan(studentId)
  if (existing) {
    clearGuestPlanner()
    return { migrated: false, reason: 'already_has_plan' }
  }

  const planId = newId()
  const now = new Date().toISOString()
  const weekIdMap = new Map<string, string>()
  const dayIdMap = new Map<string, string>()
  const sessionIdMap = new Map<string, string>()

  for (const w of bundle.planWeeks) {
    weekIdMap.set(String(w.id), newId())
  }
  for (const d of bundle.planDays) {
    dayIdMap.set(String(d.id), newId())
  }
  for (const s of bundle.sessions) {
    sessionIdMap.set(String(s.id), newId())
  }

  const planRow = {
    ...bundle.plan,
    id: planId,
    slug: generateSlug(),
    student_id: studentId,
    status: 'active',
    created_at: now,
    updated_at: now,
  }

  const { error: planErr } = await supabase.from('plans').insert(planRow)
  if (planErr) throw new Error(planErr.message)

  const planWeeks = bundle.planWeeks.map((w) => ({
    ...w,
    id: weekIdMap.get(String(w.id))!,
    plan_id: planId,
    created_at: now,
    updated_at: now,
  }))

  const planDays = bundle.planDays.map((d) => ({
    ...d,
    id: dayIdMap.get(String(d.id))!,
    plan_id: planId,
    plan_week_id: d.plan_week_id
      ? (weekIdMap.get(String(d.plan_week_id)) ?? d.plan_week_id)
      : d.plan_week_id,
    created_at: now,
    updated_at: now,
  }))

  const sessions = bundle.sessions.map((s) => ({
    ...s,
    id: sessionIdMap.get(String(s.id))!,
    plan_id: planId,
    plan_day_id: s.plan_day_id
      ? (dayIdMap.get(String(s.plan_day_id)) ?? s.plan_day_id)
      : s.plan_day_id,
    created_at: now,
    updated_at: now,
  }))

  if (planWeeks.length) {
    const { error } = await supabase.from('plan_weeks').insert(planWeeks)
    if (error) throw new Error(error.message)
  }
  if (planDays.length) {
    const { error } = await supabase.from('plan_days').insert(planDays)
    if (error) throw new Error(error.message)
  }
  if (sessions.length) {
    const { error } = await supabase.from(PLAN_TIMETABLE_TABLE).insert(sessions)
    if (error) throw new Error(error.message)
  }

  if (bundle.completions.length) {
    const rows = bundle.completions
      .filter((c) => sessionIdMap.has(c.session_id))
      .map((c) => ({
        session_id: sessionIdMap.get(c.session_id)!,
        student_id: studentId,
        minutes_completed: c.minutes_completed,
        perceived_effort: c.perceived_effort,
      }))
    if (rows.length) {
      const { error } = await supabase.from('session_completions').insert(rows)
      if (error) throw new Error(error.message)
    }
  }

  if (bundle.mockScores.length) {
    const scores = bundle.mockScores.map((m) => ({
      ...m,
      id: newId(),
      plan_id: planId,
      student_id: studentId,
      session_id: m.session_id ? (sessionIdMap.get(String(m.session_id)) ?? null) : null,
      created_at: m.created_at ?? now,
    }))
    const { error } = await supabase.from('mock_scores').insert(scores)
    if (error) throw new Error(error.message)
  }

  await supabase.from('plan_members').insert({
    plan_id: planId,
    user_id: studentId,
    role: 'student',
  })

  clearGuestPlanner()
  invalidateActivePlanCache(studentId)
  return { migrated: true }
}

export async function tryMigrateGuestPlannerOnSignIn(
  studentId: string,
): Promise<GuestPlannerBundle | null> {
  const result = await migrateGuestPlannerToCloud(studentId)
  if (result.migrated) return null
  return getGuestPlanner()
}
