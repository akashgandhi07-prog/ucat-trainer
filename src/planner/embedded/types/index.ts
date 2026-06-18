// ─── Core domain types ───────────────────────────────────────────────────────

export type UserRole = 'student' | 'tutor'
export type Availability = 'available' | 'reduced' | 'unavailable'
export type WeekType = 'school' | 'holiday'
export type PlanStatus = 'active' | 'completed' | 'archived'

/** The student's current life situation; affects how study hours are framed */
export type CurrentSituation =
  | 'school'             // attending school (sixth form / secondary)
  | 'gap_year'           // between school and university
  | 'graduated_free'     // graduated, no job, fully free
  | 'graduated_working'  // graduated, currently employed

/** Year group, only relevant when situation === 'school' */
export type SchoolYear = 'year_12' | 'year_13' | 'other'

export type SessionType =
  | 'vr_practice'
  | 'dm_practice'
  | 'qr_practice'
  | 'sjt_practice'
  | 'mini_mock'
  | 'full_mock'
  | 'reflection'
  | 'rest'

export type UCATSection = 'vr' | 'dm' | 'qr' | 'sjt'

export type MockType = 'full' | 'mini'
export type MockSource = 'medify' | 'medentry' | 'passmedicine' | 'book' | 'official'

export interface DateRange {
  start: string   // ISO date
  end: string     // ISO date
  label?: string  // e.g. "Half term", "Family holiday"
}

/**
 * 'holiday' = treated as a free day (weekend/holiday rate — typically MORE study time
 * than a school day, not less); 'busy' = fully blocked, no sessions scheduled.
 */
export type TimeAwayKind = 'holiday' | 'busy'

export interface TimeAwayPeriod extends DateRange {
  kind: TimeAwayKind
}
export type DifficultyRating = 1 | 2 | 3   // 1=too hard, 2=about right, 3=too easy

// ─── Database row types ───────────────────────────────────────────────────────

export interface DBUser {
  id: string
  email: string | null
  /** Planner signup role from OTP metadata; null when user is trainer-only or not set. */
  planner_role: UserRole | null
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface DBPlan {
  id: string
  slug: string
  student_id: string
  tutor_id: string | null
  exam_date: string           // ISO date
  exam_time: string | null    // e.g. '09:00'
  current_situation: CurrentSituation | null
  school_year: SchoolYear | null
  school_day_hours: number    // study hours on a Mon-Fri term day (or work day)
  weekend_hours: number       // study hours on Sat/Sun / holidays / days off
  holiday_periods: DateRange[] // school holiday date ranges (empty for non-school)
  has_prior_experience: boolean
  confidence_vr: number
  confidence_dm: number
  confidence_qr: number
  confidence_sjt: number
  rest_days: number[]          // 0=Sun … 6=Sat
  /** UCATSEN: full mocks scheduled at 2h30 instead of 2h */
  ucat_sen: boolean
  status: PlanStatus
  /** Goal VR+DM+QR combined total out of 2700 for mock tracking UI */
  mock_target_total?: number | null
  /** Goal SJT band (1-4, same convention as logged scores) */
  mock_target_sjt_band?: number | null
  created_at: string
  updated_at: string
}

export interface DBPlanWeek {
  id: string
  plan_id: string
  week_number: number
  week_start: string          // ISO date
  week_type: WeekType
  default_hours: number
  difficulty_rating: DifficultyRating | null
  is_locked: boolean
  tutor_note: string | null
  created_at: string
  updated_at: string
}

export interface DBPlanDay {
  id: string
  plan_id: string
  plan_week_id: string | null
  day_date: string            // ISO date
  availability: Availability
  custom_hours: number | null
  is_rest: boolean
  created_at: string
  updated_at: string
}

export interface DBSession {
  id: string
  plan_id: string
  plan_day_id: string | null
  day_date: string
  session_type: SessionType
  duration_minutes: number
  position: number
  is_timed: boolean
  notes: string | null
  /** Generated line: why this block is scheduled */
  planner_rationale?: string | null
  created_at: string
  updated_at: string
}

export interface DBSessionCompletion {
  id: string
  session_id: string
  student_id: string
  minutes_completed: number
  perceived_effort?: number | null
  completed_at: string
}

export interface DBExtraStudyLog {
  id: string
  plan_id: string
  student_id: string
  day_date: string
  section: UCATSection
  minutes: number
  created_at: string
  updated_at: string
}

export interface DBMockScore {
  id: string
  plan_id: string
  student_id: string
  session_id: string | null
  logged_date: string
  week_number: number | null
  score_vr: number | null
  score_dm: number | null
  score_qr: number | null
  score_sjt: number | null    // 1-4 band
  mock_type: MockType
  mock_source: MockSource | null
  weakness_tags?: string[]
  created_at: string
}

export interface DBWeeklyReflection {
  id: string
  plan_id: string
  student_id: string
  week_number: number
  reflection_text: string
  difficulty_rating: DifficultyRating
  created_at: string
  updated_at: string
}

export interface DBPlanMember {
  id: string
  plan_id: string
  user_id: string
  role: UserRole
  invited_at: string
  accepted_at: string | null
}

// ─── Onboarding form state ────────────────────────────────────────────────────

export interface OnboardingState {
  // Step 1: UCAT experience
  hasPriorExperience: boolean | null
  // Step 2: About you
  fullName: string
  currentSituation: CurrentSituation | null
  schoolYear: SchoolYear | null    // only when currentSituation === 'school'
  // Step 3: Exam date
  examDate: string | null
  examTime: string | null          // e.g. '09:00'
  // Step 4: Confidence
  confidence: {
    vr: number
    dm: number
    qr: number
    sjt: number
  }
  // Step 5: Study hours (framing depends on situation)
  schoolDayHours: number           // busy-day max hours (school day / work day)
  weekendHours: number             // free-day max hours (weekend / day off / all days for gap/free)
  // Step 6: Time away (holidays with reduced hours + fully blocked busy periods)
  timeAwayPeriods: TimeAwayPeriod[]
  // Step 7: Rest days
  restDays: number[]               // 0=Sun … 6=Sat (optional, no defaults)
  /** UCATSEN (extra time); full mocks in the plan become 2h30 */
  ucatSen: boolean
}

// ─── Plan generation context ──────────────────────────────────────────────────

export type Phase = 'foundations' | 'timed' | 'mini_mock' | 'full_mock' | 'final_week'

export interface PhaseConfig {
  phase: Phase
  weeksFromExam: number
  hasPriorExperience: boolean
}

export interface SectionWeight {
  vr: number
  dm: number
  qr: number
  sjt: number
}

// ─── UI / composed types ──────────────────────────────────────────────────────

export interface SessionWithCompletion extends DBSession {
  completed: boolean
  completed_minutes?: number | null
}

export interface DayWithSessions {
  day: DBPlanDay
  sessions: SessionWithCompletion[]
  totalMinutes: number
}

export interface WeekWithDays {
  week: DBPlanWeek
  days: DayWithSessions[]
  totalHoursPlanned: number
  mocksCount: number
  completionPercent: number
}

export interface PlanWithMeta extends DBPlan {
  student: DBUser | null
  tutor: DBUser | null
  weeks: WeekWithDays[]
}

export interface StudentSummary {
  user: DBUser
  plan: DBPlan
  latestMockScores: DBMockScore | null
  weeklyCompletion: number
  streak: number
}
