import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { SessionType, UCATSection } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Section colours ──────────────────────────────────────────────────────────
export const SECTION_COLORS: Record<string, string> = {
  vr_practice: 'bg-blue-100 text-blue-800 border-blue-200',
  dm_practice: 'bg-green-100 text-green-800 border-green-200',
  qr_practice: 'bg-amber-100 text-amber-800 border-amber-200',
  sjt_practice: 'bg-purple-100 text-purple-800 border-purple-200',
  full_mock:   'bg-red-100 text-red-800 border-red-200',
  mini_mock:   'bg-pink-100 text-pink-800 border-pink-200',
  reflection:  'bg-slate-100 text-slate-700 border-slate-200',
  rest:        'bg-stone-100 text-stone-500 border-stone-200',
}

export const SECTION_DOT: Record<string, string> = {
  vr_practice: 'bg-blue-500',
  dm_practice: 'bg-green-500',
  qr_practice: 'bg-amber-500',
  sjt_practice: 'bg-purple-500',
  full_mock:   'bg-red-500',
  mini_mock:   'bg-pink-500',
  reflection:  'bg-slate-400',
  rest:        'bg-stone-300',
}

export const SESSION_LABELS: Record<SessionType, string> = {
  vr_practice:  'Verbal Reasoning',
  dm_practice:  'Decision Making',
  qr_practice:  'Quantitative Reasoning',
  sjt_practice: 'Situational Judgement',
  full_mock:    'Full Mock',
  mini_mock:    'Mini Mock',
  reflection:   'Reflection',
  rest:         'Rest',
}

/** Minutes credited toward today's plan when a session is marked done (handles partial logs at or below planned time). */
export function creditedMinutesTowardPlan(
  completed: boolean,
  plannedMinutes: number,
  loggedMinutes?: number | null,
): number {
  if (!completed || plannedMinutes <= 0) return 0
  const raw = loggedMinutes ?? plannedMinutes
  return Math.min(plannedMinutes, Math.max(0, raw))
}

/** Minimal shape for deriving typical study hours from recent logs. */
export interface SessionLikeForSuggestions {
  day_date: string
  session_type: string
  duration_minutes: number
  completed: boolean
  completed_minutes?: number | null
}

function clampSuggestedHoursAvg(h: number): number {
  return Math.min(12, Math.max(0.5, Math.round(h * 2) / 2))
}

/**
 * Guesses weekday vs weekend targets from credited time on days where the plan had sessions.
 * Returns null for a bucket until there are enough samples so we don’t steer from noise.
 */
export function suggestHoursFromRecentSessions(
  sessions: SessionLikeForSuggestions[],
  todayIso: string,
  lookbackDays = 21,
): { weekday: number | null; weekend: number | null } | null {
  const todayStart = parseDate(todayIso)
  const yesterday = addDays(todayStart, -1)
  const startBound = addDays(todayStart, -lookbackDays)

  const weekdayTotals: number[] = []
  const weekendTotals: number[] = []

  if (startBound > yesterday) return null

  for (let d = new Date(startBound); d <= yesterday; d = addDays(d, 1)) {
    const ds = toISODate(d)
    const daySessions = sessions.filter(s => s.day_date === ds && s.session_type !== 'rest')
    if (daySessions.length === 0) continue

    let credited = 0
    for (const s of daySessions) {
      credited += creditedMinutesTowardPlan(
        s.completed,
        s.duration_minutes,
        s.completed_minutes,
      )
    }
    if (credited <= 0) continue

    const hours = credited / 60
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    if (isWeekend) weekendTotals.push(hours)
    else weekdayTotals.push(hours)
  }

  let weekday: number | null = null
  let weekend: number | null = null

  if (weekdayTotals.length >= 2) {
    weekday = clampSuggestedHoursAvg(
      weekdayTotals.reduce((a, b) => a + b, 0) / weekdayTotals.length,
    )
  }
  if (weekendTotals.length >= 2) {
    weekend = clampSuggestedHoursAvg(
      weekendTotals.reduce((a, b) => a + b, 0) / weekendTotals.length,
    )
  }

  if (weekday === null && weekend === null) return null
  return { weekday, weekend }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function weeksUntil(examDate: Date, from: Date = new Date()): number {
  const ms = examDate.getTime() - from.getTime()
  return Math.ceil(ms / (7 * 24 * 60 * 60 * 1000))
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Score helpers ────────────────────────────────────────────────────────────
export function sjtBandLabel(band: number): string {
  return `Band ${band}`
}

export function scoreColor(score: number | null, section: UCATSection): string {
  if (!score) return 'text-slate-400'
  if (section === 'sjt') {
    return score === 1 ? 'text-green-600' : score === 2 ? 'text-blue-600' : score === 3 ? 'text-amber-600' : 'text-red-600'
  }
  if (score >= 700) return 'text-green-600'
  if (score >= 600) return 'text-blue-600'
  if (score >= 500) return 'text-amber-600'
  return 'text-red-600'
}

// ─── Nanoid-safe slug ─────────────────────────────────────────────────────────
export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}
