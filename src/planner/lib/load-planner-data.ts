import type {
  DBMockScore,
  DBPlan,
  DBPlanDay,
  DBPlanWeek,
  DBSession,
  DBWeeklyReflection,
} from '../embedded/types'
import { PLAN_TIMETABLE_TABLE } from '../embedded/lib/planner-db-tables'
import { generateSlug, suggestHoursFromRecentSessions } from '../embedded/lib/utils'
import { toISODate } from './date-utils'
import { supabase } from '../../lib/supabase'

export type SessionWithCompletion = DBSession & {
  completed: boolean
  completed_minutes?: number | null
  perceived_effort?: number | null
}

// Explicit column lists (instead of select('*')) so payloads stay small and a new
// wide column can never silently bloat every planner request.
export const PLAN_COLUMNS =
  'id, slug, student_id, tutor_id, exam_date, exam_time, current_situation, school_year, school_day_hours, weekend_hours, holiday_periods, has_prior_experience, confidence_vr, confidence_dm, confidence_qr, confidence_sjt, rest_days, ucat_sen, status, mock_target_total, mock_target_sjt_band, created_at, updated_at'
export const PLAN_WEEK_COLUMNS =
  'id, plan_id, week_number, week_start, week_type, default_hours, difficulty_rating, is_locked, tutor_note, created_at, updated_at'
export const PLAN_DAY_COLUMNS =
  'id, plan_id, plan_week_id, day_date, availability, custom_hours, is_rest, created_at, updated_at'
export const SESSION_COLUMNS =
  'id, plan_id, plan_day_id, day_date, session_type, duration_minutes, position, is_timed, notes, planner_rationale, created_at, updated_at'
export const MOCK_SCORE_COLUMNS =
  'id, plan_id, student_id, session_id, logged_date, week_number, score_vr, score_dm, score_qr, score_sjt, mock_type, mock_source, weakness_tags, created_at'

/** session_completions row with the parent plan session embedded via the FK join. */
type PlanCompletionRow = {
  session_id: string
  minutes_completed: number
  perceived_effort: number | null
  session: { plan_id: string; day_date: string; session_type: string; duration_minutes: number }
}

/** Short-lived cache: avoids duplicate `/study-plan` → `/study-plan/plan` fetches and parallel page loads. */
const ACTIVE_PLAN_TTL_MS = 45_000
const activePlanCache = new Map<string, { plan: DBPlan | null; expiresAt: number }>()
const activePlanInFlight = new Map<string, Promise<DBPlan | null>>()
let plannerRefreshListenerAttached = false

function attachPlannerRefreshCacheClear(): void {
  if (plannerRefreshListenerAttached || typeof window === 'undefined') return
  plannerRefreshListenerAttached = true
  window.addEventListener('planner-refresh', () => {
    activePlanCache.clear()
  })
}

attachPlannerRefreshCacheClear()

/** Clear cached active plan (e.g. after creating or migrating a plan). Omit studentId to clear all. */
export function invalidateActivePlanCache(studentId?: string): void {
  if (studentId) activePlanCache.delete(studentId)
  else activePlanCache.clear()
}

async function fetchActivePlanUncached(studentId: string): Promise<DBPlan | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 8000)
  try {
    const { data, error } = await supabase
      .from('plans')
      .select(PLAN_COLUMNS)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .abortSignal(controller.signal)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as DBPlan | null
  } finally {
    window.clearTimeout(timer)
  }
}

export async function fetchActivePlan(studentId: string): Promise<DBPlan | null> {
  const now = Date.now()
  const cached = activePlanCache.get(studentId)
  if (cached && cached.expiresAt > now) {
    return cached.plan
  }
  let pending = activePlanInFlight.get(studentId)
  if (!pending) {
    pending = fetchActivePlanUncached(studentId)
      .then((plan) => {
        activePlanCache.set(studentId, { plan, expiresAt: Date.now() + ACTIVE_PLAN_TTL_MS })
        return plan
      })
      .finally(() => {
        activePlanInFlight.delete(studentId)
      })
    activePlanInFlight.set(studentId, pending)
  }
  return pending
}

/**
 * Sentinel exam date for a minimal plan row used only so `mock_scores.plan_id` FK is satisfied.
 * No calendar is generated; study-plan onboarding still treats this as “no real plan yet”.
 */
export const MOCKS_ONLY_PLAN_EXAM_SENTINEL = '2099-08-31'

export function isMocksOnlyPlaceholderPlan(plan: Pick<DBPlan, 'exam_date'>): boolean {
  return plan.exam_date === MOCKS_ONLY_PLAN_EXAM_SENTINEL
}

/** Ensure an active plan row exists so signed-in users can log mocks without completing study-plan onboarding. */
export async function ensureActivePlanForMocks(studentId: string): Promise<DBPlan> {
  let plan = await fetchActivePlan(studentId)
  if (plan) return plan

  const slug = generateSlug()
  const { data: inserted, error: insErr } = await supabase
    .from('plans')
    .insert({
      slug,
      student_id: studentId,
      exam_date: MOCKS_ONLY_PLAN_EXAM_SENTINEL,
      status: 'active',
    })
    .select(PLAN_COLUMNS)
    .single()

  if (insErr) {
    plan = await fetchActivePlan(studentId)
    if (plan) return plan
    throw new Error(insErr.message)
  }

  const row = inserted as DBPlan
  const { error: memErr } = await supabase.from('plan_members').insert({
    plan_id: row.id,
    user_id: studentId,
    role: 'student',
  })
  if (memErr) {
    plan = await fetchActivePlan(studentId)
    if (plan) return plan
    throw new Error(memErr.message)
  }

  invalidateActivePlanCache(studentId)
  const fresh = await fetchActivePlan(studentId)
  if (!fresh) throw new Error('Plan was created but could not be reloaded')
  return fresh
}

export async function loadTodayDashboard(
  studentId: string,
  plan: DBPlan,
): Promise<{
  sessions: SessionWithCompletion[]
  planDay: DBPlanDay | null
  planId: string
  examDate: string
  streak: number
  weeklyCompletion: number
  todayDate: string
  insights?: string[]
}> {
  const today = toISODate(new Date())

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const horizonStart = new Date()
  horizonStart.setDate(horizonStart.getDate() - 30)
  horizonStart.setHours(0, 0, 0, 0)
  const horizonStartIso = toISODate(horizonStart)

  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(weekEnd)

  // Single round trip: completions arrive with their parent session embedded via
  // the FK join, so there is no second fetch keyed on session ids.
  const [sessionsRes, planDayRes, weekSessionsRes, planCompletionsRes, recentCompletionsRes] =
    await Promise.all([
      supabase
        .from(PLAN_TIMETABLE_TABLE)
        .select(SESSION_COLUMNS)
        .eq('plan_id', plan.id)
        .eq('day_date', today)
        .order('position'),
      supabase
        .from('plan_days')
        .select(PLAN_DAY_COLUMNS)
        .eq('plan_id', plan.id)
        .eq('day_date', today)
        .maybeSingle(),
      supabase
        .from(PLAN_TIMETABLE_TABLE)
        .select('id')
        .eq('plan_id', plan.id)
        .gte('day_date', weekStartIso)
        .lte('day_date', weekEndIso)
        .not('session_type', 'eq', 'rest'),
      supabase
        .from('session_completions')
        .select(
          `session_id, minutes_completed, perceived_effort, session:${PLAN_TIMETABLE_TABLE}!inner(plan_id, day_date, session_type, duration_minutes)`,
        )
        .eq('student_id', studentId)
        .eq(`${PLAN_TIMETABLE_TABLE}.plan_id`, plan.id)
        .gte(`${PLAN_TIMETABLE_TABLE}.day_date`, horizonStartIso),
      supabase
        .from('session_completions')
        .select(`${PLAN_TIMETABLE_TABLE}!inner(day_date)`)
        .eq('student_id', studentId)
        .order('completed_at', { ascending: false })
        .limit(200),
    ])

  const { data: sessions, error: sessErr } = sessionsRes
  if (sessErr) throw new Error(sessErr.message)

  const { data: planDay } = planDayRes
  const { data: weekSessions } = weekSessionsRes
  const { data: recentCompletions } = recentCompletionsRes
  const planCompletions = (planCompletionsRes.data ?? []) as unknown as PlanCompletionRow[]

  const weekSessionIds = (weekSessions ?? []).map((s) => s.id)

  const todayCompletions = planCompletions.filter((c) => c.session.day_date === today)
  const weekCompletionCount = planCompletions.filter(
    (c) =>
      c.session.day_date >= weekStartIso &&
      c.session.day_date <= weekEndIso &&
      c.session.session_type !== 'rest',
  ).length

  const completionsBySession = new Map(
    todayCompletions.map((c) => [
      c.session_id,
      {
        minutes: c.minutes_completed,
        perceived: c.perceived_effort ?? null,
      },
    ]),
  )

  const weeklyCompletion = weekSessions?.length
    ? Math.round((weekCompletionCount / weekSessions.length) * 100)
    : 0

  const datesWithActivity = new Set<string>()
  for (const row of (recentCompletions ?? []) as Record<string, { day_date?: string }>[]) {
    const slot = row[PLAN_TIMETABLE_TABLE]
    if (slot?.day_date) datesWithActivity.add(slot.day_date)
  }

  let streak = 0
  const checkDate = new Date()
  checkDate.setHours(0, 0, 0, 0)
  for (let i = 0; i < 60; i++) {
    const d = toISODate(checkDate)
    if (datesWithActivity.has(d)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  const insights: string[] = []

  const planDatesWithWork = new Set<string>()
  for (const c of planCompletions) {
    if (c.minutes_completed <= 0) continue
    planDatesWithWork.add(c.session.day_date)
  }

  let quietRun = 0
  for (let i = 1; i <= 21; i++) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const iso = toISODate(d)
    if (planDatesWithWork.has(iso)) break
    quietRun++
  }

  if (quietRun >= 5) {
    insights.push(
      `No logged sessions on this plan for ${quietRun} days straight. Easing weekday targets via Rebuild plan ahead can reboot momentum.`,
    )
  }

  if (weeklyCompletion > 0 && weeklyCompletion < 35 && weekSessionIds.length >= 4) {
    insights.push(
      `Weekly completion (${weeklyCompletion}%) looks tight versus your scheduled load. Trimming busy days or nudging weekday hours down may reduce backlog guilt.`,
    )
  }

  for (const c of planCompletions) {
    if (c.perceived_effort == null) continue
    const pe = Number(c.perceived_effort)
    const mins = Number(c.minutes_completed ?? 0)
    const practiced =
      c.session.session_type.endsWith('_practice') || c.session.session_type === 'sjt_practice'
    if (practiced && pe >= 4 && mins >= c.session.duration_minutes * 0.85) {
      insights.push(
        `Recent blocks felt tiring (rated ${pe}/5) while you nailed most planned minutes. If that keeps up, shave an hour mid-week or reclaim a slower weekend pace.`,
      )
      break
    }
  }

  const sessionsWithCompletion = (sessions ?? []).map((s) => {
    const c = completionsBySession.get(s.id)
    return {
      ...s,
      completed: completionsBySession.has(s.id),
      completed_minutes: c?.minutes ?? null,
      perceived_effort: c?.perceived ?? null,
    }
  }) as SessionWithCompletion[]

  return {
    sessions: sessionsWithCompletion,
    planDay: (planDay as DBPlanDay) ?? null,
    planId: plan.id,
    examDate: plan.exam_date,
    streak,
    weeklyCompletion,
    todayDate: today,
    insights: insights.length > 0 ? insights : undefined,
  }
}

export async function loadPlanCalendar(studentId: string, plan: DBPlan) {
  const [planDaysRes, sessionsRes, extraStudyLogsRes, completionsRes] = await Promise.all([
    supabase.from('plan_days').select(PLAN_DAY_COLUMNS).eq('plan_id', plan.id).order('day_date'),
    supabase.from(PLAN_TIMETABLE_TABLE).select(SESSION_COLUMNS).eq('plan_id', plan.id).order('day_date').order('position'),
    supabase
      .from('extra_study_logs')
      .select('id, plan_id, student_id, day_date, section, minutes, created_at, updated_at')
      .eq('plan_id', plan.id)
      .eq('student_id', studentId),
    // Joined on the plan instead of a second round trip keyed on session ids.
    supabase
      .from('session_completions')
      .select(`session_id, minutes_completed, perceived_effort, ${PLAN_TIMETABLE_TABLE}!inner(plan_id)`)
      .eq('student_id', studentId)
      .eq(`${PLAN_TIMETABLE_TABLE}.plan_id`, plan.id),
  ])

  const { data: planDays, error: daysErr } = planDaysRes
  if (daysErr) throw new Error(daysErr.message)
  const { data: sessions, error: sessErr } = sessionsRes
  if (sessErr) throw new Error(sessErr.message)
  const { data: extraStudyLogs } = extraStudyLogsRes
  const { data: completions } = completionsRes

  const completionsBySession = new Map(
    (completions ?? []).map((c) => [
      c.session_id,
      {
        minutes: c.minutes_completed as number,
        perceived: (c.perceived_effort ?? null) as number | null,
      },
    ]),
  )

  return {
    plan,
    planDays: (planDays ?? []) as DBPlanDay[],
    sessions: (sessions ?? []).map((s) => {
      const c = completionsBySession.get(s.id)
      return {
        ...s,
        completed: completionsBySession.has(s.id),
        completed_minutes: c?.minutes ?? null,
        perceived_effort: c?.perceived ?? null,
      }
    }) as SessionWithCompletion[],
    extraStudyLogs: extraStudyLogs ?? [],
    todayDate: toISODate(new Date()),
    hoursSuggestion: suggestHoursFromRecentSessions(
      (sessions ?? []).map((s) => {
        const c = completionsBySession.get(s.id)
        return {
          day_date: s.day_date,
          session_type: s.session_type,
          duration_minutes: s.duration_minutes,
          completed: completionsBySession.has(s.id),
          completed_minutes: c?.minutes ?? null,
        }
      }),
      toISODate(new Date()),
    ),
  }
}

export async function loadMockScores(plan: DBPlan) {
  const { data: mockScores, error } = await supabase
    .from('mock_scores')
    .select(MOCK_SCORE_COLUMNS)
    .eq('student_id', plan.student_id)
    .order('logged_date')
  if (error) throw new Error(error.message)

  return {
    planId: plan.id,
    mockScores: (mockScores ?? []) as DBMockScore[],
    initialTargetTotal: plan.mock_target_total ?? null,
    initialTargetSjtBand: plan.mock_target_sjt_band ?? null,
  }
}

export async function loadReflect(planId: string) {
  const [{ data: reflections, error: refErr }, { data: planWeeks, error: weekErr }] =
    await Promise.all([
      supabase.from('weekly_reflections').select('*').eq('plan_id', planId).order('week_number'),
      supabase
        .from('plan_weeks')
        .select('week_number, week_start, is_locked')
        .eq('plan_id', planId)
        .order('week_number'),
    ])
  if (refErr) throw new Error(refErr.message)
  if (weekErr) throw new Error(weekErr.message)

  return {
    planId,
    reflections: (reflections ?? []) as DBWeeklyReflection[],
    planWeeks: (planWeeks ?? []) as Pick<DBPlanWeek, 'week_number' | 'week_start' | 'is_locked'>[],
  }
}
