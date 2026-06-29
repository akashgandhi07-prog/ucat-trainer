'use client'

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@/lib/app-navigation'
import { DBPlan, DBPlanDay, DBPlanWeek, DBSession, DBExtraStudyLog, SessionType, WeekIntensity } from '@/types'
import {
  addDays, toISODate, parseDate, startOfWeek, startOfMonth, isSameMonth, weeksUntil,
  SESSION_LABELS,
  creditedMinutesTowardPlan,
  suggestHoursFromRecentSessions,
} from '@/lib/utils'
import { getPhase } from '@/lib/plan-engine'
import { SessionLogSheet, type SessionLogSavePayload } from '@/components/sessions/session-log-sheet'
import {
  completeSession,
  rebalancePlan,
  saveExtraStudy as persistExtraStudy,
  setDayBlocked,
  setWeekIntensity,
  updateExamDateTime,
  updatePlanDay,
} from '@/lib/planner-client'
import { UCAT_EXAM_WINDOW_END_ISO, UCAT_EXAM_WINDOW_START_ISO } from '../../../../lib/ucatExamWindow'
import { useAuth } from '../../../../hooks/useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionWithCompletion extends DBSession {
  completed: boolean
  completed_minutes?: number | null
  perceived_effort?: number | null
}

interface DayOverride {
  availability: 'available' | 'reduced' | 'unavailable'
  isRest: boolean
  customHours: number | null
}

interface PlanCalendarProps {
  plan: DBPlan
  planDays: DBPlanDay[]
  planWeeks?: DBPlanWeek[]
  sessions: SessionWithCompletion[]
  extraStudyLogs: DBExtraStudyLog[]
  readOnly?: boolean
  todayDate: string
}

// ─── Calendar grid helpers ────────────────────────────────────────────────────

function buildGrid(month: Date): { date: Date; dateStr: string; inMonth: boolean }[] {
  const first = startOfMonth(month)
  const gridStart = startOfWeek(first, 1)   // Monday
  const cells = []
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i)
    cells.push({ date, dateStr: toISODate(date), inMonth: isSameMonth(date, month) })
  }
  return cells
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function prevMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}
function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

// ─── Session pill ─────────────────────────────────────────────────────────────

const TYPE_SHORT: Partial<Record<SessionType, string>> = {
  vr_practice:  'VR',
  dm_practice:  'DM',
  qr_practice:  'QR',
  sjt_practice: 'SJT',
  full_mock:    'Mock',
  mini_mock:    'Mini',
  reflection:   'Reflect',
}

const TYPE_PILL: Record<string, string> = {
  vr_practice:  'bg-secondary text-foreground',
  dm_practice:  'bg-secondary text-foreground',
  qr_practice:  'bg-secondary text-foreground',
  sjt_practice: 'bg-secondary text-foreground',
  full_mock:    'bg-foreground text-card',
  mini_mock:    'bg-secondary text-foreground',
  reflection:   'bg-secondary text-muted-foreground',
}

function sessionDisplayLabel(session: Pick<DBSession, 'session_type' | 'notes'>): string {
  if (session.session_type === 'mini_mock' && session.notes?.trim()) return session.notes.trim()
  return SESSION_LABELS[session.session_type]
}

function sessionCalendarLabel(session: Pick<DBSession, 'session_type' | 'notes'>): string {
  if (session.session_type === 'mini_mock' && session.notes?.trim()) {
    return session.notes.trim().replace(/\s+Mock$/i, '')
  }
  return TYPE_SHORT[session.session_type] ?? session.session_type
}

/** Compact study-time label: minutes under an hour, else hours with at most one decimal. */
function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m'
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = totalMinutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

// ─── Block day button ─────────────────────────────────────────────────────────

function BlockDayButton({
  planId,
  dateStr,
  isCurrentlyBlocked,
  onDone,
}: {
  planId: string
  dateStr: string
  isCurrentlyBlocked: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function toggle() {
    setBusy(true)
    setErr('')
    try {
      await setDayBlocked({ planId, dayDate: dateStr, blocked: !isCurrentlyBlocked })
      router.refresh()
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-border px-5 py-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={[
          'w-full text-sm font-medium py-2 rounded-lg border transition-colors disabled:opacity-50',
          isCurrentlyBlocked
            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
            : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100',
        ].join(' ')}
      >
        {busy ? 'Updating…' : isCurrentlyBlocked ? 'Unblock this day' : 'Block this day (no study)'}
      </button>
      {err && <p className="text-xs text-red-600 text-center mt-1">{err}</p>}
    </div>
  )
}

// ─── Day detail modal ─────────────────────────────────────────────────────────

const SECTION_OPTS = [
  { key: 'vr',  label: 'VR',  color: 'border-border bg-secondary text-foreground' },
  { key: 'dm',  label: 'DM',  color: 'border-border bg-secondary text-foreground' },
  { key: 'qr',  label: 'QR',  color: 'border-border bg-secondary text-foreground' },
  { key: 'sjt', label: 'SJT', color: 'border-border bg-secondary text-foreground' },
] as const

type ExtraSection = 'vr' | 'dm' | 'qr' | 'sjt'
type ExtraStudyBySection = Partial<Record<ExtraSection, number>>

function DayDetailModal({
  dateStr,
  sessions,
  dayRecord,
  override,
  planId,
  examDate,
  todayDate,
  readOnly,
  planRestDays,
  extraStudyBySection,
  planSchoolDayHours,
  planWeekendHours,
  hoursSuggestion,
  onClose,
  onAvailabilityUpdate,
  onExtraStudyUpdate,
}: {
  dateStr: string
  sessions: SessionWithCompletion[]
  dayRecord?: DBPlanDay
  override?: DayOverride
  planId: string
  examDate: string
  todayDate: string
  readOnly?: boolean
  /** Day-of-week indices (0=Sun…6=Sat) that are structural rest days in the plan */
  planRestDays: number[]
  extraStudyBySection: ExtraStudyBySection
  planSchoolDayHours: number
  planWeekendHours: number
  hoursSuggestion: { weekday: number | null; weekend: number | null } | null
  onClose: () => void
  onAvailabilityUpdate: (dateStr: string, avail: 'available' | 'reduced' | 'unavailable', hours: number | null, rangeEnd?: string) => void
  onExtraStudyUpdate: (dateStr: string, next: ExtraStudyBySection) => void
}) {
  const router = useRouter()
  const date = parseDate(dateStr)
  const isExamDay = dateStr === examDate
  const isPastOrToday = dateStr <= todayDate
  const isFutureDay = dateStr > todayDate
  const isRest = override ? override.isRest : (dayRecord?.is_rest ?? false)
  /** True when this day is a recurring rest day from the plan's rest_days setting (not a user-created block) */
  const isStructuralRestDay = planRestDays.includes(date.getDay())
  const activeSessions = sessions.filter(s => s.session_type !== 'rest')
  const hasMockSession = activeSessions.some(s => s.session_type === 'full_mock' || s.session_type === 'mini_mock')

  // ── Completion state (optimistic) ───────────────────────────────────────────
  const [completions, setCompletions] = useState<Map<string, { completed: boolean; minutes: number | null }>>(
    () => new Map(sessions.map(s => [s.id, { completed: s.completed, minutes: s.completed_minutes ?? null }]))
  )
  const [sessionSheet, setSessionSheet] = useState<SessionWithCompletion | null>(null)

  const completedCount = activeSessions.filter(s => completions.get(s.id)?.completed).length
  const totalMinutes = activeSessions.reduce((a, s) => a + s.duration_minutes, 0)
  const creditedToday = activeSessions.reduce((a, s) => {
    const c = completions.get(s.id) ?? { completed: false, minutes: null as number | null }
    return a + creditedMinutesTowardPlan(!!c.completed, s.duration_minutes, c.minutes)
  }, 0)
  const timeProgressPct = totalMinutes > 0 ? Math.round((creditedToday / totalMinutes) * 100) : 0

  // Secondary tools (extra study, rebuild, availability) live behind one disclosure so
  // the default view is just "what am I doing today" + logging.
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ── Availability edit ────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [availability, setAvailability] = useState<'available' | 'reduced' | 'unavailable'>(
    (override?.availability ?? dayRecord?.availability ?? 'available') as 'available' | 'reduced' | 'unavailable'
  )
  const [customHours, setCustomHours] = useState(
    (override?.customHours ?? dayRecord?.custom_hours ?? '').toString()
  )
  const [rangeEnd, setRangeEnd] = useState(dateStr)
  const [saving, setSaving] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const [regenError, setRegenError] = useState('')
  const [extraStudyError, setExtraStudyError] = useState('')
  const [extraStudySaved, setExtraStudySaved] = useState(false)
  const [savingExtra, setSavingExtra] = useState(false)
  const [extraStudy, setExtraStudy] = useState<ExtraStudyBySection>(() => ({
    vr: extraStudyBySection.vr ?? 0,
    dm: extraStudyBySection.dm ?? 0,
    qr: extraStudyBySection.qr ?? 0,
    sjt: extraStudyBySection.sjt ?? 0,
  }))
  /** Shown when the user taps a session on a future calendar day so it is obvious why logging is blocked. */
  const [futureSessionsNotice, setFutureSessionsNotice] = useState('')
  useEffect(() => {
    setFutureSessionsNotice('')
  }, [dateStr])
  useEffect(() => {
    if (!futureSessionsNotice) return
    const tid = window.setTimeout(() => setFutureSessionsNotice(''), 5200)
    return () => window.clearTimeout(tid)
  }, [futureSessionsNotice])

  async function handleSave() {
    setSaving(true)
    setAvailabilityError('')
    try {
      const start = dateStr
      const end = rangeEnd >= start ? rangeEnd : start
      const d = parseDate(start)
      const dEnd = parseDate(end)
      for (let cur = new Date(d); cur <= dEnd; cur.setDate(cur.getDate() + 1)) {
        const ds = toISODate(new Date(cur))
        await updatePlanDay({
          planId,
          dayDate: ds,
          availability,
          customHours: availability === 'reduced' && customHours ? Number(customHours) : null,
        })
      }
      router.refresh()
      onAvailabilityUpdate(start, availability,
        availability === 'reduced' && customHours ? Number(customHours) : null,
        end !== start ? end : undefined)
      onClose()
    } catch (e: unknown) {
      setAvailabilityError(e instanceof Error ? e.message : 'Could not update availability')
    } finally {
      setSaving(false)
    }
  }

  // ── Future plan adjustment ───────────────────────────────────────────────────
  const [needsMore, setNeedsMore] = useState<Set<string>>(new Set())
  const [rebuildSchoolH, setRebuildSchoolH] = useState(() => String(planSchoolDayHours))
  const [rebuildWeekendH, setRebuildWeekendH] = useState(() => String(planWeekendHours))
  const [regenerating, setRegenerating] = useState(false)
  const [regenDone, setRegenDone] = useState(false)
  const [regenWarnings, setRegenWarnings] = useState<string[]>([])

  function toggleNeedsMore(key: string) {
    setNeedsMore(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setRegenError('')
    setRegenWarnings([])
    const sd = Number(rebuildSchoolH)
    const we = Number(rebuildWeekendH)
    if (!Number.isFinite(sd) || !Number.isFinite(we)) {
      setRegenError('Enter valid hour targets for weekdays and weekends')
      setRegenerating(false)
      return
    }
    try {
      const { warnings: ws } = await rebalancePlan({
        planId,
        fromDate: dateStr,
        needsMore: Array.from(needsMore),
        schoolDayHours: sd,
        weekendHours: we,
      })
      setRegenWarnings(ws)
      setRegenDone(true)
      const delayMs = ws.length > 0 ? 4200 : 1200
      setTimeout(() => { router.refresh(); onClose() }, delayMs)
    } catch (e: unknown) {
      setRegenError(e instanceof Error ? e.message : 'Regeneration failed')
    } finally {
      setRegenerating(false)
    }
  }

  async function saveExtraStudy() {
    setSavingExtra(true)
    setExtraStudyError('')
    const sections: ExtraSection[] = ['vr', 'dm', 'qr', 'sjt']
    try {
      for (const section of sections) {
        const minutes = Math.max(0, Number(extraStudy[section] ?? 0))
        await persistExtraStudy({
          planId,
          dayDate: dateStr,
          section,
          minutes,
        })
      }
      onExtraStudyUpdate(dateStr, extraStudy)
      setExtraStudySaved(true)
      window.setTimeout(() => setExtraStudySaved(false), 2500)
    } catch (e: unknown) {
      setExtraStudyError(e instanceof Error ? e.message : 'Failed to save extra study')
    } finally {
      setSavingExtra(false)
    }
  }

  const [markingAll, setMarkingAll] = useState(false)
  const [markAllError, setMarkAllError] = useState('')

  /** Fast path for "I did everything as planned": log every unlogged session at its full planned time. */
  async function markAllDone() {
    const pending = activeSessions.filter(s => !(completions.get(s.id)?.completed ?? s.completed))
    if (pending.length === 0) return
    setMarkingAll(true)
    setMarkAllError('')
    try {
      for (const s of pending) {
        await completeSession({
          sessionId: s.id,
          completed: true,
          minutesCompleted: s.duration_minutes,
          perceivedEffort: null,
        })
        setCompletions(prev => new Map(prev).set(s.id, { completed: true, minutes: s.duration_minutes }))
      }
      router.refresh()
    } catch (e) {
      setMarkAllError(e instanceof Error ? e.message : 'Could not log sessions')
    } finally {
      setMarkingAll(false)
    }
  }

  async function persistDaySessionLog(
    sessionId: string,
    payload: SessionLogSavePayload,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await completeSession({
        sessionId,
        completed: payload.completed,
        minutesCompleted: payload.minutesCompleted,
        perceivedEffort: payload.perceivedEffort,
      })
      setCompletions(prev => {
        const next = new Map(prev)
        next.set(sessionId, {
          completed: payload.completed,
          minutes: payload.completed ? payload.minutesCompleted : null,
        })
        return next
      })
      router.refresh()
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Could not save' }
    }
  }

  const sessionSheetTarget = sessionSheet
    ? {
        id: sessionSheet.id,
        session_type: sessionSheet.session_type,
        duration_minutes: sessionSheet.duration_minutes,
        notes: sessionSheet.notes,
        completed: completions.get(sessionSheet.id)?.completed ?? sessionSheet.completed,
        completed_minutes:
          completions.get(sessionSheet.id)?.minutes ?? sessionSheet.completed_minutes ?? null,
        perceived_effort: sessionSheet.perceived_effort ?? null,
      }
    : null

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => { if (!sessionSheet) onClose() }}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b border-border flex items-start justify-between shrink-0 ${isExamDay ? 'bg-secondary' : ''}`}>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {date.toLocaleDateString('en-GB', { weekday: 'long' })}
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            {isExamDay && (
              <span className="text-xs font-semibold text-muted-foreground bg-secondary rounded-full px-2 py-0.5 mt-1 inline-block">
                Exam day
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (sessionSheet) setSessionSheet(null)
              else onClose()
            }}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none mt-1 rounded-lg hover:bg-secondary px-1"
            aria-label={sessionSheet ? 'Close session editor' : 'Close'}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* Sessions */}
          <div className="px-5 py-4">
            {isRest ? (
              <div className="text-center py-6 text-slate-400">
                <div className="text-3xl mb-2">{availability === 'unavailable' ? '🚫' : '🛋️'}</div>
                <p className="text-sm font-medium">
                  {availability === 'unavailable' ? 'Marked as unavailable' : 'Rest day'}
                </p>
              </div>
            ) : activeSessions.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessions</p>
                  <p className="text-xs text-slate-400 text-right leading-snug">
                    {isPastOrToday && activeSessions.length > 0 && (
                      <span>{completedCount}/{activeSessions.length} logged · ~{timeProgressPct}% of planned time · </span>
                    )}
                    <span>{(totalMinutes / 60).toFixed(1)}h planned</span>
                  </p>
                </div>
                {futureSessionsNotice ? (
                  <div
                    role="status"
                    className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                  >
                    {futureSessionsNotice}
                  </div>
                ) : null}
                {activeSessions.map(s => {
                  const completion = completions.get(s.id) ?? { completed: false, minutes: null }
                  const done = completion.completed
                  const loggedM = completion.minutes ?? (done ? s.duration_minutes : null)
                  const fullHit = !!done && loggedM !== null && loggedM >= s.duration_minutes
                  const isPartial =
                    !!done && loggedM !== null && loggedM > 0 && loggedM < s.duration_minutes
                  const canInteractWithSessionRow = !readOnly
                  const doneZero = !!done && loggedM === 0

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        if (readOnly) return
                        if (isFutureDay) {
                          setFutureSessionsNotice(
                            'That day is still in the future. You can tap today or any past day on the calendar to log what you completed.',
                          )
                          return
                        }
                        setSessionSheet(s)
                      }}
                      className={[
                        'w-full flex flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-all border',
                        canInteractWithSessionRow
                          ? 'cursor-pointer active:scale-[0.98]'
                          : 'cursor-not-allowed opacity-80',
                        !done
                          ? `${TYPE_PILL[s.session_type] ?? 'bg-slate-100 text-slate-700'} border-transparent`
                          : isPartial || doneZero
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-green-50 border-green-200',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3 w-full">
                      <div
                        className={
                          [
                            'w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition-all',
                            !done ? 'border-current opacity-50' : '',
                            fullHit ? 'bg-green-500 border-green-500 text-white' : '',
                            isPartial ? 'bg-amber-400 border-amber-400 text-white' : '',
                            doneZero ? 'bg-amber-200 border-amber-300 text-amber-900' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                        }
                      >
                        {done && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium flex-1 ${fullHit ? 'line-through text-slate-400' : ''}`}>
                        {sessionDisplayLabel(s)}
                      </span>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          !done ? 'opacity-60'
                          : isPartial ? 'text-amber-800'
                          : doneZero ? 'text-amber-800'
                          : fullHit ? 'text-green-600'
                          : 'text-amber-800'
                        }`}
                      >
                        {done && loggedM !== null ? `${loggedM}/${s.duration_minutes}m` : `${s.duration_minutes}m`}
                      </span>
                      </div>
                      {s.planner_rationale && (
                        <p className="text-[11px] text-slate-600 leading-snug pl-8 pr-1">
                          {s.planner_rationale}
                        </p>
                      )}
                    </button>
                  )
                })}

                {isPastOrToday && !readOnly && completedCount < activeSessions.length && (
                  <>
                    <button
                      type="button"
                      onClick={markAllDone}
                      disabled={markingAll}
                      className="w-full rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-semibold py-2 hover:bg-green-100 disabled:opacity-50"
                    >
                      {markingAll ? 'Logging…' : 'Mark all as done (full time)'}
                    </button>
                    {markAllError && <p className="text-xs text-red-600 text-center">{markAllError}</p>}
                  </>
                )}
                {isPastOrToday && !readOnly && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    Tap a session to log actual time (full block, partial, or not done).
                  </p>
                )}
                {isFutureDay && !readOnly && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    Future days are view only until that date. Tap a session to see a reminder.
                  </p>
                )}
                {hasMockSession && (
                  <Link
                    to="/mock-scores"
                    className="block w-full rounded-lg border border-border bg-secondary px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-secondary/80"
                  >
                    Log mock score
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 py-6">No sessions scheduled.</p>
            )}
          </div>

          {/* Disclosure: everything below is secondary (log extra study, rebuild, availability) */}
          {!readOnly && !isExamDay && (
            <button
              type="button"
              onClick={() => setAdvancedOpen(o => !o)}
              className="flex w-full items-center justify-between border-t border-border px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              aria-expanded={advancedOpen}
            >
              <span>{isFutureDay ? 'Adjust this day or rebuild ahead' : 'Log extra study or change availability'}</span>
              <span className={`text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
          )}

          {isPastOrToday && !readOnly && advancedOpen && (
            <div className="border-t border-border px-5 py-4 space-y-3 bg-slate-50">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Extra study done</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Log extra minutes you did beyond this plan (add or reduce anytime).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SECTION_OPTS.map(({ key, label, color }) => {
                  const section = key as ExtraSection
                  const value = Math.max(0, Number(extraStudy[section] ?? 0))
                  return (
                    <div key={section} className="rounded-lg border border-border bg-white p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-bold rounded-full border px-2 py-0.5 ${color}`}>{label}</span>
                        <span className="text-[11px] text-muted-foreground">{value}m</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={value}
                        onChange={(e) => {
                          const next = Number(e.target.value)
                          setExtraStudy(prev => ({ ...prev, [section]: Number.isFinite(next) ? Math.max(0, next) : 0 }))
                        }}
                        className="w-full h-8 rounded-md border border-border px-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={saveExtraStudy}
                disabled={savingExtra}
                className="w-full rounded-lg border border-border bg-card text-foreground text-sm font-medium py-2 hover:bg-secondary disabled:opacity-50"
              >
                {savingExtra ? 'Saving extra study…' : 'Save extra study minutes'}
              </button>
              {extraStudyError && <p className="text-xs text-red-600 text-center">{extraStudyError}</p>}
              {extraStudySaved && !extraStudyError && (
                <p className="text-xs text-green-600 text-center font-medium">Saved</p>
              )}
            </div>
          )}

          {isFutureDay && !isExamDay && !readOnly && advancedOpen && (
            <div className="border-t border-border px-5 py-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Rebuild from this week</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set your weekday and weekend hour targets and rebuild every week from here to your exam. Earlier weeks start lighter and ramp up toward these numbers near the exam.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-white p-2.5 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Weekday hours (full target near exam)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={rebuildSchoolH}
                    onChange={e => setRebuildSchoolH(e.target.value)}
                    className="w-full h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {hoursSuggestion?.weekday != null && (
                    <button
                      type="button"
                      onClick={() => setRebuildSchoolH(String(hoursSuggestion.weekday))}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Use recent weekday average (~{hoursSuggestion.weekday}h)
                    </button>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-white p-2.5 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Weekend hours (full target near exam)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={rebuildWeekendH}
                    onChange={e => setRebuildWeekendH(e.target.value)}
                    className="w-full h-8 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {hoursSuggestion?.weekend != null && (
                    <button
                      type="button"
                      onClick={() => setRebuildWeekendH(String(hoursSuggestion.weekend))}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Use recent weekend average (~{hoursSuggestion.weekend}h)
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                You can still fine-tune single days with Edit availability before or after a rebuild; busy days stay protected.
              </p>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">More practice on…</p>
                <div className="grid grid-cols-4 gap-2">
                  {SECTION_OPTS.map(({ key, label, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleNeedsMore(key)}
                      className={[
                        'rounded-lg border-2 py-2 text-xs font-bold transition-all',
                        needsMore.has(key) ? color : 'border-border text-slate-400 hover:border-border bg-white',
                      ].join(' ')}
                    >
                      {label}
                      {needsMore.has(key) && <div className="text-[9px] font-normal mt-0.5 opacity-70">more focus</div>}
                    </button>
                  ))}
                </div>
              </div>

              {regenDone ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 text-center font-medium">
                    Plan updated, reloading...
                  </div>
                  {regenWarnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950 space-y-1">
                      <p className="font-semibold">Heads-up</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {regenWarnings.map(w => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {regenerating ? 'Regenerating…' : `Regenerate plan from this week${needsMore.size > 0 ? ` · more ${Array.from(needsMore).join(', ').toUpperCase()}` : ''}`}
                </button>
              )}
              {regenError && <p className="text-xs text-red-600">{regenError}</p>}
            </div>
          )}

          {/* Quick day block (future non-structural-rest days only) */}
          {isFutureDay && !readOnly && !isExamDay && !isStructuralRestDay && advancedOpen && (
            <BlockDayButton
              planId={planId}
              dateStr={dateStr}
              isCurrentlyBlocked={isRest && (override?.availability ?? dayRecord?.availability) === 'unavailable'}
              onDone={onClose}
            />
          )}

          {/* Edit availability */}
          {!readOnly && !isExamDay && advancedOpen && (
            <div className="border-t border-border px-5 py-4 space-y-3 bg-slate-50">
              {!editMode ? (
                <button
                  onClick={() => { setEditMode(true); setAvailabilityError('') }}
                  className="w-full text-sm font-medium text-muted-foreground hover:text-primary py-1 transition-colors"
                >
                  Edit availability for this day
                </button>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Edit availability</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: 'available',   icon: '✓', label: 'Available' },
                      { v: 'reduced',     icon: '~', label: 'Reduced' },
                      { v: 'unavailable', icon: '✗', label: 'Busy' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setAvailability(opt.v)}
                        className={`rounded-lg border-2 py-2 text-xs font-semibold transition-all ${
                          availability === opt.v
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-border bg-white'
                        }`}
                      >
                        <div className="font-bold">{opt.icon}</div>
                        <div>{opt.label}</div>
                      </button>
                    ))}
                  </div>

                  {availability === 'reduced' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground shrink-0">Hours available:</label>
                      <input
                        type="number" min={0.5} max={8} step={0.5}
                        value={customHours}
                        onChange={e => setCustomHours(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="w-full h-8 rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-slate-400 shrink-0">h</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">Apply until:</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      min={dateStr}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="flex-1 h-8 rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {rangeEnd === dateStr
                      ? 'Applies to this day only.'
                      : `From ${parseDate(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} → ${parseDate(rangeEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`}
                  </p>

                  {availabilityError && <p className="text-xs text-red-600">{availabilityError}</p>}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setEditMode(false); setAvailabilityError('') }}
                      className="flex-1 text-sm text-muted-foreground hover:text-slate-700 py-2 rounded-lg border border-border hover:bg-slate-100">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 text-sm bg-primary text-white py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      <SessionLogSheet
        zClassName="z-[200]"
        session={sessionSheetTarget}
        onClose={() => setSessionSheet(null)}
        onSave={payload =>
          sessionSheet ? persistDaySessionLog(sessionSheet.id, payload) : Promise.resolve({ ok: false, error: 'No session' })
        }
      />
    </>
  )
}

// ─── Rebuild-from-here modal (toolbar) ────────────────────────────────────────

export function RebuildAheadModal({
  plan,
  todayDate,
  examDate,
  hoursSuggestion,
  onClose,
}: {
  plan: DBPlan
  todayDate: string
  examDate: string
  hoursSuggestion: { weekday: number | null; weekend: number | null } | null
  onClose: () => void
}) {
  const router = useRouter()
  const [fromDate, setFromDate] = useState(() => todayDate)
  const [needsMore, setNeedsMore] = useState<Set<string>>(new Set())
  const [schoolH, setSchoolH] = useState(() => String(plan.school_day_hours))
  const [weekendH, setWeekendH] = useState(() => String(plan.weekend_hours))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [srvWarnings, setSrvWarnings] = useState<string[]>([])

  function toggleNeedsMore(key: string) {
    setNeedsMore(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function submit() {
    setBusy(true)
    setErr('')
    setSrvWarnings([])
    let anchor = fromDate
    if (anchor < todayDate) anchor = todayDate
    if (anchor > examDate) anchor = examDate

    const sd = Number(schoolH)
    const we = Number(weekendH)
    if (!Number.isFinite(sd) || !Number.isFinite(we)) {
      setErr('Enter valid hour targets for weekdays and weekends')
      setBusy(false)
      return
    }

    try {
      const { warnings: ws } = await rebalancePlan({
        planId: plan.id,
        fromDate: anchor,
        needsMore: Array.from(needsMore),
        schoolDayHours: sd,
        weekendHours: we,
      })
      setSrvWarnings(ws)
      setDone(true)
      const delayMs = ws.length > 0 ? 4200 : 1200
      setTimeout(() => {
        router.refresh()
        onClose()
      }, delayMs)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Regeneration failed'
      setErr(msg)
    } finally {
      setBusy(false)
    }
  }

  const previewAnchor = fromDate >= todayDate ? fromDate : todayDate
  const startLabel = parseDate(previewAnchor).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      onClick={() => !busy && onClose()}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="rebuild-plan-title"
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between shrink-0">
          <div>
            <h2 id="rebuild-plan-title" className="text-lg font-bold text-slate-900">
              Rebuild plan ahead
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Session blocks from the week of{' '}
              <span className="font-semibold text-slate-700">{startLabel}</span>{' '}
              forward are regenerated.
              Locked weeks stay as they are.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => !busy && onClose()}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none mt-0.5 rounded-lg hover:bg-secondary px-1 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Rebuild from
            </label>
            <input
              type="date"
              min={todayDate}
              max={examDate}
              value={fromDate < todayDate ? todayDate : fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="mt-1.5 w-full h-10 rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Sessions from this date forward will be regenerated. Leave as today unless you want to keep this week as-is.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-slate-50/80 p-2.5 space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Weekday hours (full target near exam)</label>
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={schoolH}
                onChange={e => setSchoolH(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {hoursSuggestion?.weekday != null && (
                <button
                  type="button"
                  onClick={() => setSchoolH(String(hoursSuggestion.weekday))}
                  className="text-[11px] text-primary hover:underline font-medium text-left"
                >
                  Recent avg ~{hoursSuggestion.weekday}h
                </button>
              )}
            </div>
            <div className="rounded-lg border border-border bg-slate-50/80 p-2.5 space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Weekend hours (full target near exam)</label>
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={weekendH}
                onChange={e => setWeekendH(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {hoursSuggestion?.weekend != null && (
                <button
                  type="button"
                  onClick={() => setWeekendH(String(hoursSuggestion.weekend))}
                  className="text-[11px] text-primary hover:underline font-medium text-left"
                >
                  Recent avg ~{hoursSuggestion.weekend}h
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 -mt-1">
            Saved on your profile as full weekday and weekend targets for the stretch closest to your exam. When the plan spans more than three weeks, scheduled hours start around half of those targets and increase week by week until they reach full strength as the exam draws near; three weeks or shorter runs at full intensity from the outset. Saturdays, Sundays and marked holidays keep using the weekend target. Individual days remain editable anytime after rebuilding.
          </p>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">More practice on…</p>
            <div className="grid grid-cols-4 gap-2">
              {SECTION_OPTS.map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleNeedsMore(key)}
                  className={[
                    'rounded-lg border-2 py-2 text-xs font-bold transition-all',
                    needsMore.has(key) ? color : 'border-border text-slate-400 hover:border-border bg-white',
                  ].join(' ')}
                >
                  {label}
                  {needsMore.has(key) && (
                    <div className="text-[9px] font-normal mt-0.5 opacity-70">more focus</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {done ? (
            <div className="space-y-2">
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 text-center font-medium">
                Plan updated, reloading...
              </div>
              {srvWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950 space-y-1">
                  <p className="font-semibold">Heads-up</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {srvWarnings.map(w => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {busy ? 'Regenerating…' : 'Apply & regenerate'}
            </button>
          )}
          {err && <p className="text-xs text-red-600 text-center">{err}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Exam date editor ─────────────────────────────────────────────────────────

function ExamDateEditModal({
  plan,
  onClose,
}: {
  plan: DBPlan
  onClose: () => void
}) {
  const router = useRouter()
  const { refetchProfile } = useAuth()
  const [examDate, setExamDate] = useState(plan.exam_date)
  const [examTime, setExamTime] = useState(plan.exam_time ?? '')
  const [saving, setSaving] = useState<'rebuild' | 'date-only' | null>(null)
  const [error, setError] = useState('')

  const deltaDays = Math.round(
    (parseDate(examDate).getTime() - parseDate(plan.exam_date).getTime()) / 86_400_000,
  )
  const dateChanged = examDate !== plan.exam_date
  const movedLater = deltaDays > 0
  // A shift of a week or more is worth a clear, recommended re-spread of the whole plan.
  const significantShift = Math.abs(deltaDays) >= 7

  async function submit(regenerate: boolean) {
    setSaving(regenerate ? 'rebuild' : 'date-only')
    setError('')
    try {
      await updateExamDateTime({
        planId: plan.id,
        examDate,
        examTime: examTime || null,
        regenerate,
      })
      await refetchProfile()
      toast.success(regenerate ? 'Exam date updated and plan rebuilt' : 'Exam date updated')
      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update exam date')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      onClick={() => !saving && onClose()}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-exam-date-title"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="edit-exam-date-title" className="text-lg font-bold text-slate-900">
            Edit exam date
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Change your UCAT date or time. If the date moves, we&apos;ll suggest re-spreading your plan to match.
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              UCAT date
            </label>
            <input
              type="date"
              min={UCAT_EXAM_WINDOW_START_ISO}
              max={UCAT_EXAM_WINDOW_END_ISO}
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Time
            </label>
            <input
              type="time"
              value={examTime}
              onChange={e => setExamTime(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Smart suggestion when the date shifts meaningfully */}
          {dateChanged && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                significantShift
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-border bg-secondary/60 text-slate-600'
              }`}
            >
              <p className="font-semibold">
                Your exam moves {Math.abs(deltaDays)} day{Math.abs(deltaDays) === 1 ? '' : 's'}{' '}
                {movedLater ? 'later' : 'earlier'}.
              </p>
              <p className="mt-0.5">
                {movedLater
                  ? 'Rebuilding re-spreads your plan over the longer timeline — lighter now, ramping up as the new date approaches.'
                  : 'Rebuilding compresses your plan and steps up the intensity to fit the shorter timeline.'}
                {' '}Your per-week intensity choices and busy days are kept.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="space-y-2 pt-1">
            {dateChanged ? (
              <>
                <button
                  type="button"
                  disabled={!!saving || !examDate}
                  onClick={() => submit(true)}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving === 'rebuild' ? 'Rebuilding…' : 'Save & rebuild plan (recommended)'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!!saving}
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!!saving || !examDate}
                    onClick={() => submit(false)}
                    className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {saving === 'date-only' ? 'Saving…' : 'Save date only'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!!saving}
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!saving || !examDate}
                  onClick={() => submit(false)}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({
  cell,
  sessions,
  dayRecord,
  override,
  isToday,
  isExamDay,
  isPlanStart,
  isSelected,
  onClick,
}: {
  cell: { date: Date; dateStr: string; inMonth: boolean }
  sessions: SessionWithCompletion[]
  dayRecord?: DBPlanDay
  override?: DayOverride
  isToday: boolean
  isExamDay: boolean
  isPlanStart: boolean
  isSelected: boolean
  onClick: () => void
}) {
  const activeSessions = sessions.filter(s => s.session_type !== 'rest')
  const isRest = override ? override.isRest : (dayRecord?.is_rest ?? false)
  const isUnavailable = (override?.availability ?? dayRecord?.availability) === 'unavailable'
  const dayTotalMinutes = activeSessions.reduce((a, s) => a + s.duration_minutes, 0)
  const completionPct =
    activeSessions.length === 0
      ? 0
      : activeSessions.reduce(
          (acc, s) =>
            acc +
            creditedMinutesTowardPlan(s.completed, s.duration_minutes, s.completed_minutes) /
              Math.max(s.duration_minutes, 1),
          0,
        ) / activeSessions.length

  // Display up to 3 session dots, then "+N"
  const dots = activeSessions.slice(0, 3)
  const extra = activeSessions.length - 3

  return (
    <button
      onClick={onClick}
      className={[
        'relative flex flex-col min-h-[72px] sm:min-h-[80px] p-1.5 sm:p-2 text-left transition-all rounded-lg border',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        !cell.inMonth ? 'opacity-30 cursor-default pointer-events-none' : 'cursor-pointer',
        isSelected ? 'ring-2 ring-blue-500 border-border bg-secondary' :
        isToday ? 'border-primary/40 bg-secondary/80' :
        isExamDay ? 'border-amber-400 bg-amber-50' :
        isRest ? 'border-slate-100 bg-stone-50' :
        'border-slate-100 bg-white hover:border-border hover:shadow-sm',
      ].join(' ')}
      type="button"
      disabled={!cell.inMonth}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span className={[
          'text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full',
          isToday ? 'bg-primary text-white' :
          isExamDay ? 'bg-amber-500 text-white' :
          'text-slate-600',
        ].join(' ')}>
          {cell.date.getDate()}
        </span>
        {isExamDay ? (
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Exam</span>
        ) : isPlanStart && !isToday ? (
          <span className="text-[9px] font-bold text-green-600 uppercase">Start</span>
        ) : dayTotalMinutes > 0 && !isUnavailable ? (
          <span className="text-[10px] font-bold text-slate-500 tabular-nums">{formatDuration(dayTotalMinutes)}</span>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1">
        {isUnavailable ? (
          <span className="text-[10px] text-slate-400 italic">Busy</span>
        ) : isRest && activeSessions.length === 0 ? (
          <span className="text-[10px] text-stone-400 italic">Rest</span>
        ) : dots.length > 0 ? (
          <div className="flex flex-wrap gap-0.5">
            {dots.map(s => (
              <span
                key={s.id}
                className={[
                  'inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold rounded px-1 py-0.5',
                  TYPE_PILL[s.session_type] ?? 'bg-slate-100 text-slate-600',
                  s.completed ? 'opacity-40' : '',
                ].join(' ')}
              >
                {s.completed && (
                  <svg className="w-2 h-2 shrink-0" fill="none" viewBox="0 0 8 8">
                    <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <span>{sessionCalendarLabel(s)}</span>
                <span className="font-normal opacity-70 tabular-nums">{s.duration_minutes}m</span>
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[9px] text-slate-400 px-0.5 self-center">+{extra}</span>
            )}
          </div>
        ) : null}
      </div>

      {/* Completion bar */}
      {activeSessions.length > 0 && (
        <div className="mt-1 h-0.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all"
            style={{ width: `${completionPct * 100}%` }}
          />
        </div>
      )}
    </button>
  )
}

// ─── This-week structured summary ─────────────────────────────────────────────

const PHASE_LABEL: Record<string, { name: string; blurb: string }> = {
  foundations: { name: 'Foundations', blurb: 'Building technique on each section, untimed.' },
  timed:       { name: 'Timed practice', blurb: 'Section practice against the clock.' },
  mini_mock:   { name: 'Mini-mock phase', blurb: 'Short timed checkpoints before full mocks.' },
  full_mock:   { name: 'Full-mock phase', blurb: 'Regular full mocks to build stamina and pacing.' },
  final_week:  { name: 'Final push', blurb: 'Maximum intensity — mocks and review to peak on exam day.' },
}

const INTENSITY_OPTS: { key: WeekIntensity; label: string; hint: string }[] = [
  { key: 'lighter',  label: 'Ease off',  hint: 'Lighter week' },
  { key: 'standard', label: 'Standard',  hint: 'As planned' },
  { key: 'harder',   label: 'Push hard', hint: 'Heavier week' },
]

function ThisWeekCard({
  plan,
  planWeeks,
  sessions,
  todayDate,
  readOnly,
  onOpenToday,
}: {
  plan: DBPlan
  planWeeks: DBPlanWeek[]
  sessions: SessionWithCompletion[]
  todayDate: string
  readOnly?: boolean
  onOpenToday: () => void
}) {
  const router = useRouter()
  const today = parseDate(todayDate)
  const weekStart = startOfWeek(today, 1)
  const weekStartIso = toISODate(weekStart)
  const weekEndIso = toISODate(addDays(weekStart, 6))
  const examDate = parseDate(plan.exam_date)

  const weekSessions = sessions.filter(
    s => s.session_type !== 'rest' && s.day_date >= weekStartIso && s.day_date <= weekEndIso,
  )
  const plannedMin = weekSessions.reduce((a, s) => a + s.duration_minutes, 0)
  const creditedMin = weekSessions.reduce(
    (a, s) => a + creditedMinutesTowardPlan(s.completed, s.duration_minutes, s.completed_minutes),
    0,
  )
  const pct = plannedMin > 0 ? Math.round((creditedMin / plannedMin) * 100) : 0
  const mocks = weekSessions.filter(s => s.session_type === 'full_mock' || s.session_type === 'mini_mock').length
  // Sessions scheduled up to and including today that haven't been logged — the actionable backlog.
  const dueUnlogged = weekSessions.filter(s => s.day_date <= todayDate && !s.completed).length
  const weekHasSessions = weekSessions.length > 0

  const weeksRemaining = weeksUntil(examDate, weekStart)
  const phase = getPhase(weeksRemaining, plan.has_prior_experience)
  const phaseInfo = PHASE_LABEL[phase] ?? PHASE_LABEL.timed
  const daysToExam = Math.max(0, Math.round((examDate.getTime() - today.getTime()) / 86_400_000))

  const currentWeek = planWeeks.find(w => w.week_start === weekStartIso)
  const intensity: WeekIntensity = currentWeek?.intensity ?? 'standard'

  const [saving, setSaving] = useState<WeekIntensity | null>(null)
  const [error, setError] = useState('')

  async function choose(next: WeekIntensity) {
    if (readOnly || saving || next === intensity) return
    setSaving(next)
    setError('')
    try {
      await setWeekIntensity({ planId: plan.id, weekStart: weekStartIso, intensity: next })
      router.refresh()
      window.dispatchEvent(new CustomEvent('planner-refresh'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update this week')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary">This week</span>
            <span className="text-[11px] font-semibold text-muted-foreground">· {phaseInfo.name}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{phaseInfo.blurb}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-slate-900 leading-none">{daysToExam}</p>
          <p className="text-[11px] text-muted-foreground">days to exam</p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-secondary/60 py-2">
          <p className="text-base font-bold text-slate-900 tabular-nums">{formatDuration(plannedMin)}</p>
          <p className="text-[11px] text-muted-foreground">planned</p>
        </div>
        <div className="rounded-lg bg-secondary/60 py-2">
          <p className="text-base font-bold text-slate-900 tabular-nums">{mocks}</p>
          <p className="text-[11px] text-muted-foreground">{mocks === 1 ? 'mock' : 'mocks'}</p>
        </div>
        <div className="rounded-lg bg-secondary/60 py-2">
          <p className="text-base font-bold text-slate-900 tabular-nums">{pct}%</p>
          <p className="text-[11px] text-muted-foreground">done</p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      {/* Primary action + backlog nudge */}
      {!readOnly && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onOpenToday}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Log today&apos;s study
          </button>
          {weekHasSessions && dueUnlogged > 0 ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              {dueUnlogged} session{dueUnlogged === 1 ? '' : 's'} up to today {dueUnlogged === 1 ? 'isn’t' : 'aren’t'} logged yet — tap a day to catch up.
            </p>
          ) : weekHasSessions ? (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              You’re all caught up this week. Nice work — keep the momentum going.
            </p>
          ) : null}
        </div>
      )}

      {/* Intensity picker */}
      {!readOnly && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            How hard do you want to go this week?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {INTENSITY_OPTS.map(opt => {
              const active = intensity === opt.key
              const busy = saving === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => choose(opt.key)}
                  disabled={!!saving}
                  className={[
                    'rounded-lg border-2 py-2 px-1 text-center transition-all disabled:opacity-60',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-white text-slate-600 hover:border-primary/40',
                  ].join(' ')}
                >
                  <div className="text-xs font-bold">{busy ? '…' : opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.hint}</div>
                </button>
              )
            })}
          </div>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          {intensity !== 'standard' && !error && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {intensity === 'harder'
                ? 'This week is dialled up — more sessions packed into your available days.'
                : 'This week is eased off — fewer sessions so you can recover or catch up.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main calendar ────────────────────────────────────────────────────────────

const DOW_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function PlanCalendar({ plan, planDays, planWeeks, sessions, extraStudyLogs, readOnly, todayDate }: PlanCalendarProps) {
  const today = parseDate(todayDate)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [currentMonth, setCurrentMonth] = useState(() => {
    // Start at the month containing today
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showRebuildAhead, setShowRebuildAhead] = useState(false)
  const [showExamDateEdit, setShowExamDateEdit] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)

  useEffect(() => {
    if (readOnly) return
    const open = searchParams.get('rebuild')
    if (open !== '1' && open !== 'true') return
    setShowRebuildAhead(true)
    const next = new URLSearchParams(searchParams)
    next.delete('rebuild')
    const qs = next.toString()
    navigate(qs ? `${location.pathname}?${qs}` : location.pathname, { replace: true })
  }, [readOnly, searchParams, navigate, location.pathname])

  // Local overrides (availability changes applied by the user this session)
  const [dayOverrides, setDayOverrides] = useState<Map<string, DayOverride>>(new Map())
  const [extraByDate, setExtraByDate] = useState<Map<string, ExtraStudyBySection>>(() => {
    const byDate = new Map<string, ExtraStudyBySection>()
    for (const row of extraStudyLogs) {
      const current = byDate.get(row.day_date) ?? {}
      byDate.set(row.day_date, { ...current, [row.section as ExtraSection]: row.minutes })
    }
    return byDate
  })

  const daysByDate = new Map<string, DBPlanDay>()
  for (const d of planDays) daysByDate.set(d.day_date, d)

  const sessionsByDate = new Map<string, SessionWithCompletion[]>()
  for (const s of sessions) {
    const list = sessionsByDate.get(s.day_date) ?? []
    list.push(s)
    sessionsByDate.set(s.day_date, list)
  }

  const hoursSuggestion = useMemo(
    () => suggestHoursFromRecentSessions(sessions, todayDate),
    [sessions, todayDate],
  )

  const examDate = plan.exam_date
  const planStart = todayDate  // plan effectively starts at today

  async function handleDownloadPdf() {
    if (pdfExporting) return
    setPdfExporting(true)
    try {
      const { exportPlanToPdf } = await import('@/lib/export-plan-pdf')
      exportPlanToPdf({ plan, planDays, sessions, todayDate })
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Could not create PDF. Try again or use another browser.')
    } finally {
      setPdfExporting(false)
    }
  }

  function handleAvailabilityUpdate(
    startDate: string,
    avail: 'available' | 'reduced' | 'unavailable',
    hours: number | null,
    endDate?: string,
  ) {
    setDayOverrides(prev => {
      const next = new Map(prev)
      const end = endDate ?? startDate
      const s = parseDate(startDate)
      const e = parseDate(end)
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const ds = toISODate(new Date(d))
        next.set(ds, {
          availability: avail,
          isRest: avail === 'unavailable',
          customHours: hours,
        })
      }
      return next
    })
    setSelectedDate(null)
  }

  function handleExtraStudyUpdate(dateStr: string, next: ExtraStudyBySection) {
    setExtraByDate(prev => new Map(prev).set(dateStr, next))
  }

  const grid = buildGrid(currentMonth)

  // Stats for current month
  const monthSessions = grid
    .filter(c => c.inMonth)
    .flatMap(c => (sessionsByDate.get(c.dateStr) ?? []).filter(s => s.session_type !== 'rest'))
  const monthPlannedMinutes = monthSessions.reduce((a, s) => a + s.duration_minutes, 0)
  const monthCreditedMinutes = monthSessions.reduce(
    (a, s) => a + creditedMinutesTowardPlan(s.completed, s.duration_minutes, s.completed_minutes),
    0,
  )
  const monthProgressPct =
    monthPlannedMinutes > 0 ? Math.round((monthCreditedMinutes / monthPlannedMinutes) * 100) : 0
  const monthMocks = monthSessions.filter(s => s.session_type === 'full_mock' || s.session_type === 'mini_mock').length
  const monthHours = monthSessions.reduce((a, s) => a + s.duration_minutes, 0) / 60

  // Jump helpers
  const canGoPrev = currentMonth > new Date(parseDate(planStart).getFullYear(), parseDate(planStart).getMonth(), 1)
  const canGoNext = currentMonth < new Date(parseDate(examDate).getFullYear(), parseDate(examDate).getMonth(), 1)

  return (
    <div className="w-full max-w-none p-4 md:p-8 space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900">My Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Exam: {parseDate(examDate).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
            {(plan as any).exam_time && (
              <span className="ml-2 text-slate-400">at {(plan as any).exam_time}</span>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowExamDateEdit(true)}
                className="ml-2 inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Edit
              </button>
            )}
          </p>
          {readOnly && (
            <p className="mt-2 w-full text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Guest plan on this device only. Sign in to rebuild your timetable, edit future days and sync across devices. You can still download a PDF below.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowRebuildAhead(true)}
              className="text-xs bg-white border border-border rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Rebuild plan ahead
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfExporting}
            className="text-xs bg-white border border-border rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
          >
            {pdfExporting ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* This-week structured summary + intensity dial */}
      {planWeeks && planWeeks.length > 0 && (
        <ThisWeekCard
          plan={plan}
          planWeeks={planWeeks}
          sessions={sessions}
          todayDate={todayDate}
          readOnly={readOnly}
          onOpenToday={() => {
            setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            setSelectedDate(todayDate)
          }}
        />
      )}

      {/* Month navigation + stats */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <button
            onClick={() => setCurrentMonth(prevMonth)}
            disabled={!canGoPrev}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>
          <div className="text-center">
            <h2 className="font-bold text-slate-900">{monthLabel(currentMonth)}</h2>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {monthHours.toFixed(1)}h · {monthMocks} mock{monthMocks !== 1 ? 's' : ''}
              {monthSessions.length > 0 && ` · ${monthProgressPct}% logged`}
            </p>
            <div className="flex gap-3 mt-1 justify-center">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
                className="text-xs font-medium text-primary hover:underline"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date(parseDate(examDate).getFullYear(), parseDate(examDate).getMonth(), 1))}
                className="text-xs font-medium text-primary hover:underline"
              >
                Exam month
              </button>
            </div>
          </div>
          <button
            onClick={() => setCurrentMonth(nextMonth)}
            disabled={!canGoNext}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>
        </div>

        {/* DOW headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DOW_HEADERS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 p-2">
          {grid.map(cell => (
            <DayCell
              key={cell.dateStr}
              cell={cell}
              sessions={sessionsByDate.get(cell.dateStr) ?? []}
              dayRecord={daysByDate.get(cell.dateStr)}
              override={dayOverrides.get(cell.dateStr)}
              isToday={cell.dateStr === todayDate}
              isExamDay={cell.dateStr === examDate}
              isPlanStart={cell.dateStr === todayDate}
              isSelected={selectedDate === cell.dateStr}
              onClick={() => setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
            />
          ))}
        </div>

        {/* Hint */}
        {!readOnly && (
          <div className="px-4 py-3 border-t border-border">
            <span className="text-xs text-slate-400">
              Tap any day to view its sessions, log time or adjust it.
            </span>
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDate && (
        <DayDetailModal
          key={`${selectedDate}-${(sessionsByDate.get(selectedDate) ?? []).map(s => `${s.id}:${Number(s.completed)}:${s.completed_minutes ?? ''}`).join('|')}`}
          dateStr={selectedDate}
          sessions={sessionsByDate.get(selectedDate) ?? []}
          dayRecord={daysByDate.get(selectedDate)}
          override={dayOverrides.get(selectedDate)}
          planId={plan.id}
          examDate={examDate}
          todayDate={todayDate}
          readOnly={readOnly}
          planRestDays={plan.rest_days ?? []}
          extraStudyBySection={extraByDate.get(selectedDate) ?? {}}
          planSchoolDayHours={plan.school_day_hours}
          planWeekendHours={plan.weekend_hours}
          hoursSuggestion={hoursSuggestion}
          onClose={() => setSelectedDate(null)}
          onAvailabilityUpdate={handleAvailabilityUpdate}
          onExtraStudyUpdate={handleExtraStudyUpdate}
        />
      )}

      {showRebuildAhead && !readOnly && (
        <RebuildAheadModal
          plan={plan}
          todayDate={todayDate}
          examDate={examDate}
          hoursSuggestion={hoursSuggestion}
          onClose={() => setShowRebuildAhead(false)}
        />
      )}

      {showExamDateEdit && !readOnly && (
        <ExamDateEditModal
          plan={plan}
          onClose={() => setShowExamDateEdit(false)}
        />
      )}
    </div>
  )
}
