'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { useRouter } from '@/lib/app-navigation'
import { DBPlan, DBPlanDay, DBSession, DBExtraStudyLog, SessionType } from '@/types'
import {
  addDays, toISODate, parseDate, startOfWeek, startOfMonth, isSameMonth,
  SESSION_LABELS,
  creditedMinutesTowardPlan,
  suggestHoursFromRecentSessions,
} from '@/lib/utils'
import { SessionLogSheet, type SessionLogSavePayload } from '@/components/sessions/session-log-sheet'
import {
  completeSession,
  rebalancePlan,
  saveExtraStudy as persistExtraStudy,
  updatePlanDay,
} from '@/lib/planner-client'

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
  vr_practice:  'bg-blue-100 text-blue-800',
  dm_practice:  'bg-green-100 text-green-800',
  qr_practice:  'bg-amber-100 text-amber-800',
  sjt_practice: 'bg-purple-100 text-purple-800',
  full_mock:    'bg-red-100 text-red-800',
  mini_mock:    'bg-pink-100 text-pink-800',
  reflection:   'bg-slate-100 text-slate-700',
}

// ─── Day detail modal ─────────────────────────────────────────────────────────

const SECTION_OPTS = [
  { key: 'vr',  label: 'VR',  color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { key: 'dm',  label: 'DM',  color: 'border-green-400 bg-green-50 text-green-700' },
  { key: 'qr',  label: 'QR',  color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'sjt', label: 'SJT', color: 'border-purple-400 bg-purple-50 text-purple-700' },
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
  const activeSessions = sessions.filter(s => s.session_type !== 'rest')

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
        <div className={`px-5 py-4 border-b border-slate-100 flex items-start justify-between shrink-0 ${isExamDay ? 'bg-amber-50' : ''}`}>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {date.toLocaleDateString('en-GB', { weekday: 'long' })}
            </p>
            <h2 className="text-lg font-bold text-slate-900">
              {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            {isExamDay && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mt-1 inline-block">
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
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none mt-1 rounded-lg hover:bg-slate-100 px-1"
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sessions</p>
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
                        {SESSION_LABELS[s.session_type]}
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
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 py-6">No sessions scheduled.</p>
            )}
          </div>

          {isPastOrToday && !readOnly && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
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
                    <div key={section} className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] font-bold rounded-full border px-2 py-0.5 ${color}`}>{label}</span>
                        <span className="text-[11px] text-slate-500">{value}m</span>
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
                        className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={saveExtraStudy}
                disabled={savingExtra}
                className="w-full rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium py-2 hover:bg-slate-100 disabled:opacity-50"
              >
                {savingExtra ? 'Saving extra study…' : 'Save extra study minutes'}
              </button>
              {extraStudyError && <p className="text-xs text-red-600 text-center">{extraStudyError}</p>}
              {extraStudySaved && !extraStudyError && (
                <p className="text-xs text-green-600 text-center font-medium">Saved</p>
              )}
            </div>
          )}

          {isFutureDay && !isExamDay && !readOnly && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Adjust future focus</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rebuild sessions from this calendar week onward. The weekday and weekend hours you enter are full targets by the weeks closest to your exam: further out, scheduled time ramps up weekly from about half those targets until it reaches the full numbers near the exam. Plans of three weeks or fewer use full strength from the start. Holiday periods still use weekend-style hours.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Weekday hours (full target near exam)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={rebuildSchoolH}
                    onChange={e => setRebuildSchoolH(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {hoursSuggestion?.weekday != null && (
                    <button
                      type="button"
                      onClick={() => setRebuildSchoolH(String(hoursSuggestion.weekday))}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Use recent weekday average (~{hoursSuggestion.weekday}h)
                    </button>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Weekend hours (full target near exam)</label>
                  <input
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={rebuildWeekendH}
                    onChange={e => setRebuildWeekendH(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {hoursSuggestion?.weekend != null && (
                    <button
                      type="button"
                      onClick={() => setRebuildWeekendH(String(hoursSuggestion.weekend))}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
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
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">More practice on…</p>
                <div className="grid grid-cols-4 gap-2">
                  {SECTION_OPTS.map(({ key, label, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleNeedsMore(key)}
                      className={[
                        'rounded-lg border-2 py-2 text-xs font-bold transition-all',
                        needsMore.has(key) ? color : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white',
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
                  className="w-full rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {regenerating ? 'Regenerating…' : `Regenerate plan from this week${needsMore.size > 0 ? ` · more ${Array.from(needsMore).join(', ').toUpperCase()}` : ''}`}
                </button>
              )}
              {regenError && <p className="text-xs text-red-600">{regenError}</p>}
            </div>
          )}

          {/* Edit availability */}
          {!readOnly && !isExamDay && (
            <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
              {!editMode ? (
                <button
                  onClick={() => { setEditMode(true); setAvailabilityError('') }}
                  className="w-full text-sm font-medium text-slate-500 hover:text-blue-600 py-1 transition-colors"
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
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="font-bold">{opt.icon}</div>
                        <div>{opt.label}</div>
                      </button>
                    ))}
                  </div>

                  {availability === 'reduced' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 shrink-0">Hours available:</label>
                      <input
                        type="number" min={0.5} max={8} step={0.5}
                        value={customHours}
                        onChange={e => setCustomHours(e.target.value)}
                        placeholder="e.g. 1.5"
                        className="w-full h-8 rounded-lg border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-400 shrink-0">h</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 shrink-0 whitespace-nowrap">Apply until:</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      min={dateStr}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="flex-1 h-8 rounded-lg border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="flex-1 text-sm text-slate-500 hover:text-slate-700 py-2 rounded-lg border border-slate-200 hover:bg-slate-100">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 text-sm bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <h2 id="rebuild-plan-title" className="text-lg font-bold text-slate-900">
              Rebuild plan ahead
            </h2>
            <p className="text-xs text-slate-500 mt-1">
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
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none mt-0.5 rounded-lg hover:bg-slate-100 px-1 shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
              Anchor date
            </label>
            <input
              type="date"
              min={todayDate}
              max={examDate}
              value={fromDate < todayDate ? todayDate : fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="mt-1.5 w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Usually today or the start of next week; pick whatever week you want the reshuffle to begin from.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Weekday hours (full target near exam)</label>
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={schoolH}
                onChange={e => setSchoolH(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {hoursSuggestion?.weekday != null && (
                <button
                  type="button"
                  onClick={() => setSchoolH(String(hoursSuggestion.weekday))}
                  className="text-[11px] text-blue-600 hover:underline font-medium text-left"
                >
                  Recent avg ~{hoursSuggestion.weekday}h
                </button>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Weekend hours (full target near exam)</label>
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                value={weekendH}
                onChange={e => setWeekendH(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {hoursSuggestion?.weekend != null && (
                <button
                  type="button"
                  onClick={() => setWeekendH(String(hoursSuggestion.weekend))}
                  className="text-[11px] text-blue-600 hover:underline font-medium text-left"
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
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">More practice on…</p>
            <div className="grid grid-cols-4 gap-2">
              {SECTION_OPTS.map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleNeedsMore(key)}
                  className={[
                    'rounded-lg border-2 py-2 text-xs font-bold transition-all',
                    needsMore.has(key) ? color : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white',
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
              className="w-full rounded-lg bg-blue-600 text-white text-sm font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 transition-all"
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
        isSelected ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50' :
        isToday ? 'border-blue-400 bg-blue-50/80' :
        isExamDay ? 'border-amber-400 bg-amber-50' :
        isRest ? 'border-slate-100 bg-stone-50' :
        'border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm',
      ].join(' ')}
      type="button"
      disabled={!cell.inMonth}
    >
      {/* Date number */}
      <div className="flex items-center justify-between mb-1">
        <span className={[
          'text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full',
          isToday ? 'bg-blue-500 text-white' :
          isExamDay ? 'bg-amber-500 text-white' :
          'text-slate-600',
        ].join(' ')}>
          {cell.date.getDate()}
        </span>
        {isExamDay && <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wide">Exam</span>}
        {isPlanStart && !isToday && !isExamDay && (
          <span className="text-[9px] font-bold text-green-600 uppercase">Start</span>
        )}
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
                {TYPE_SHORT[s.session_type] ?? s.session_type}
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

// ─── Main calendar ────────────────────────────────────────────────────────────

const DOW_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function PlanCalendar({ plan, planDays, sessions, extraStudyLogs, readOnly, todayDate }: PlanCalendarProps) {
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revision Plan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Exam: {parseDate(examDate).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
            {(plan as any).exam_time && (
              <span className="ml-2 text-slate-400">at {(plan as any).exam_time}</span>
            )}
          </p>
          {readOnly ? (
            <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-xl">
              Guest plan on this device only. Sign in to rebuild your timetable, edit future days and sync across devices. You can still download a PDF below.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500 max-w-xl">
              Tap any day to change availability or hours, log extra practice or rebuild from that week. Use{' '}
              <strong>Rebuild plan ahead</strong>
              {' '}for a full refresh from a date you choose.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowRebuildAhead(true)}
              className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 font-semibold shadow-sm transition-colors"
            >
              Rebuild plan ahead
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfExporting}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
          >
            {pdfExporting ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(parseDate(examDate).getFullYear(), parseDate(examDate).getMonth(), 1))}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Exam month
          </button>
        </div>
      </div>

      {/* Month navigation + stats */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
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
            <div className="flex gap-4 mt-1 justify-center">
              <span className="text-xs text-slate-400">{monthHours.toFixed(1)}h planned</span>
              <span className="text-xs text-slate-400">{monthMocks} mock{monthMocks !== 1 ? 's' : ''}</span>
              {monthSessions.length > 0 && (
                <span className="text-xs text-slate-400">{monthProgressPct}% of planned time logged</span>
              )}
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

        {/* Legend */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
          {([
            ['VR', 'bg-blue-500'],
            ['DM', 'bg-green-500'],
            ['QR', 'bg-amber-500'],
            ['SJT', 'bg-purple-500'],
            ['Full Mock', 'bg-red-500'],
            ['Mini Mock', 'bg-pink-500'],
            ['Reflection', 'bg-slate-400'],
          ] as [string, string][]).map(([label, dot]) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
          {!readOnly && (
            <span className="text-xs text-slate-400 ml-auto italic">
              Click any day to view or edit
            </span>
          )}
        </div>
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
    </div>
  )
}
