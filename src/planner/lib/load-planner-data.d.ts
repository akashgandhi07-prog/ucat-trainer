export type SessionWithCompletion = {
  id: string
  day_date: string
  session_type: string
  duration_minutes: number
  completed: boolean
  completed_minutes?: number | null
  perceived_effort?: number | null
  [key: string]: unknown
}

export type DBPlanLite = {
  id: string
  exam_date: string
  mock_target_total?: number | null
  mock_target_sjt_band?: number | null
  school_day_hours?: number
  weekend_hours?: number
  [key: string]: unknown
}

export function fetchActivePlan(studentId: string): Promise<DBPlanLite | null>

export function invalidateActivePlanCache(studentId?: string): void

export function loadTodayDashboard(
  studentId: string,
  plan: DBPlanLite,
): Promise<{
  sessions: SessionWithCompletion[]
  planDay: Record<string, unknown> | null
  planId: string
  examDate: string
  streak: number
  weeklyCompletion: number
  todayDate: string
  insights?: string[]
}>

export function loadPlanCalendar(
  studentId: string,
  plan: DBPlanLite,
): Promise<{
  plan: DBPlanLite
  planDays: Record<string, unknown>[]
  sessions: SessionWithCompletion[]
  extraStudyLogs: Record<string, unknown>[]
  todayDate: string
}>

export function loadMockScores(plan: DBPlanLite): Promise<{
  planId: string
  mockScores: Record<string, unknown>[]
  initialTargetTotal: number | null
  initialTargetSjtBand: number | null
}>

export function loadReflect(planId: string): Promise<{
  planId: string
  reflections: Record<string, unknown>[]
  planWeeks: Record<string, unknown>[]
}>
