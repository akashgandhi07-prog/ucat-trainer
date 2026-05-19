'use client'

import { useRouter } from '@/lib/app-navigation'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DBSession, DBPlanDay, DBPlan } from '@/types'
import type { ExportPlanPdfInput } from '../../../lib/export-plan-pdf'
import { RebuildAheadModal } from '@/components/plan/plan-calendar'
import { SessionPill } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateLong, parseDate, weeksUntil, creditedMinutesTowardPlan } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SessionLogSheet, type SessionLogSavePayload } from '@/components/sessions/session-log-sheet'
import { upsertGuestCompletion } from '@/lib/guest-planner-store'
import { completeSession, updatePlanDay } from '@/lib/planner-client'

interface SessionWithCompletion extends DBSession {
  completed: boolean
  completed_minutes?: number | null
  perceived_effort?: number | null
}

interface TodayViewProps {
  sessions: SessionWithCompletion[]
  planDay: DBPlanDay | null
  planId: string
  examDate: string
  streak: number
  weeklyCompletion: number
  todayDate: string
  /** Recovery / calibration nuggets from dashboard */
  insights?: string[]
  /** Persist completions to localStorage instead of Supabase */
  guestMode?: boolean
  /** Full plan row (signed-in); required for rebuild modal */
  plan?: DBPlan | null
  /** Snapshot for PDF export (full calendar rows) */
  plannerPdf?: ExportPlanPdfInput | null
  /** Optional averages for rebuild modal hour hints */
  hoursSuggestion?: { weekday: number | null; weekend: number | null } | null
}

export function TodayView({
  sessions,
  planDay,
  planId,
  examDate,
  streak,
  weeklyCompletion,
  todayDate,
  insights,
  guestMode = false,
  plan = null,
  plannerPdf = null,
  hoursSuggestion = null,
}: TodayViewProps) {
  const router = useRouter()
  const [localSessions, setLocalSessions] = useState(sessions)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [markedBusy, setMarkedBusy] = useState(planDay?.is_rest ?? false)
  const [showBusyMenu, setShowBusyMenu] = useState(false)
  const [busySaving, setBusySaving] = useState(false)
  const [busyError, setBusyError] = useState('')
  const [sheetSession, setSheetSession] = useState<SessionWithCompletion | null>(null)
  const [showRebuild, setShowRebuild] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)

  const sessionsSyncKey = useMemo(
    () =>
      sessions
        .map(s => `${s.id}:${s.completed}:${s.completed_minutes ?? ''}:${s.perceived_effort ?? ''}`)
        .join('|'),
    [sessions],
  )

  const [appliedSessionsKey, setAppliedSessionsKey] = useState(sessionsSyncKey)

  if (sessionsSyncKey !== appliedSessionsKey) {
    setAppliedSessionsKey(sessionsSyncKey)
    setLocalSessions(sessions)
  }

  const isRest = markedBusy || planDay?.is_rest || localSessions.length === 0
  const activeSessions = localSessions.filter(s => s.session_type !== 'rest')
  const plannedTodayMinutes = activeSessions.reduce((a, s) => a + s.duration_minutes, 0)
  const creditedSum = activeSessions.reduce(
    (a, s) => a + creditedMinutesTowardPlan(s.completed, s.duration_minutes, s.completed_minutes),
    0,
  )
  const todayPercent =
    plannedTodayMinutes > 0 ? Math.round((creditedSum / plannedTodayMinutes) * 100) : 0
  const completedCount = activeSessions.filter(s => s.completed).length
  const totalCount = activeSessions.length

  const weeksLeft = weeksUntil(parseDate(examDate))

  async function markDayBusy(availability: 'unavailable' | 'reduced', hours?: number) {
    if (guestMode) {
      setBusyError('Sign in to save day changes to your plan.')
      return
    }
    setBusySaving(true)
    setBusyError('')
    try {
      await updatePlanDay({
        planId,
        dayDate: todayDate,
        availability,
        customHours: hours ?? null,
      })
      setMarkedBusy(availability === 'unavailable')
      setShowBusyMenu(false)
      router.refresh()
    } catch (e) {
      setBusyError(e instanceof Error ? e.message : 'Could not update day')
    } finally {
      setBusySaving(false)
    }
  }

  async function markDayAvailable() {
    if (guestMode) {
      setBusyError('Sign in to save day changes to your plan.')
      return
    }
    setBusySaving(true)
    setBusyError('')
    try {
      await updatePlanDay({ planId, dayDate: todayDate, availability: 'available' })
      setMarkedBusy(false)
      setShowBusyMenu(false)
      router.refresh()
    } catch (e) {
      setBusyError(e instanceof Error ? e.message : 'Could not update day')
    } finally {
      setBusySaving(false)
    }
  }

  async function persistSession(sessionId: string, payload: SessionLogSavePayload) {
    const prev = localSessions.find(s => s.id === sessionId)
    if (!prev) return { ok: false as const, error: 'Session not found' }

    const nextCompleted = payload.completed
    const nextMinutes = nextCompleted ? payload.minutesCompleted : null
    const nextEffort =
      nextCompleted && typeof payload.perceivedEffort === 'number'
        ? payload.perceivedEffort
        : null

    setLocalSessions(sess =>
      sess.map(s =>
        s.id === sessionId
          ? {
              ...s,
              completed: nextCompleted,
              completed_minutes: nextMinutes,
              perceived_effort: nextEffort,
            }
          : s
      )
    )
    setSavingId(sessionId)

    try {
      if (guestMode) {
        upsertGuestCompletion(
          sessionId,
          nextCompleted,
          nextMinutes,
          nextEffort,
        )
        return { ok: true as const }
      }

      await completeSession({
        sessionId,
        completed: nextCompleted,
        minutesCompleted: nextMinutes,
        perceivedEffort: payload.perceivedEffort ?? null,
      })
      router.refresh()
      return { ok: true as const }
    } catch {
      setLocalSessions(sess =>
        sess.map(s =>
          s.id === sessionId
            ? {
                ...s,
                completed: prev.completed,
                completed_minutes: prev.completed_minutes ?? null,
                perceived_effort: prev.perceived_effort ?? null,
              }
            : s
        )
      )
      return { ok: false as const, error: 'Network error' }
    } finally {
      setSavingId(null)
    }
  }

  async function handleDownloadPlannerPdf() {
    if (!plannerPdf) return
    setPdfBusy(true)
    try {
      const { exportPlanToPdf } = await import('../../../lib/export-plan-pdf')
      exportPlanToPdf(plannerPdf)
      toast.success('PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Could not create PDF. Try another browser if this persists.')
    } finally {
      setPdfBusy(false)
    }
  }

  function PlannerToolbarLinks() {
    return (
      <div className="rounded-xl border border-border bg-white px-4 py-3 flex flex-wrap gap-2 items-center shadow-sm">
        <Link
          to="/study-plan/plan"
          className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Calendar · edit days and hours
        </Link>
        {plannerPdf ? (
          <button
            type="button"
            onClick={() => void handleDownloadPlannerPdf()}
            disabled={pdfBusy}
            className="inline-flex items-center rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        ) : null}
        {!guestMode && plan ? (
          <>
            <button
              type="button"
              onClick={() => setShowRebuild(true)}
              className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Rebuild plan ahead
            </button>
            <Link
              to="/study-plan/plan?rebuild=1"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-slate-700"
            >
              Open rebuild wizard on calendar
            </Link>
          </>
        ) : guestMode ? (
          <p className="text-xs text-muted-foreground">
            Sign in to rebuild your timetable or edit future weeks from the calendar.
          </p>
        ) : null}
      </div>
    )
  }

  const rebuildModal =
    showRebuild && plan ? (
      <RebuildAheadModal
        plan={plan}
        todayDate={todayDate}
        examDate={examDate}
        hoursSuggestion={hoursSuggestion}
        onClose={() => setShowRebuild(false)}
      />
    ) : null

  const sheetTarget = sheetSession
    ? {
        id: sheetSession.id,
        session_type: sheetSession.session_type,
        duration_minutes: sheetSession.duration_minutes,
        completed: sheetSession.completed,
        completed_minutes: sheetSession.completed_minutes ?? null,
        perceived_effort: sheetSession.perceived_effort ?? null,
      }
    : null

  if (isRest) {
    return (
      <>
        <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
          <PlannerToolbarLinks />
          <div className="text-center space-y-4 py-16">
          <div className="text-6xl">🛋️</div>
          <h1 className="text-2xl font-bold text-slate-900">Rest day</h1>
          <p className="text-muted-foreground text-lg">
            {formatDateLong(parseDate(todayDate))}
          </p>
          <p className="text-muted-foreground max-w-md mx-auto">
            Rest is an essential part of learning. Come back tomorrow ready to go.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 font-medium">
            🔥 {streak} day streak
          </div>
          </div>
        </div>
        {rebuildModal}
        <SessionLogSheet
          session={sheetTarget}
          onClose={() => setSheetSession(null)}
          onSave={payload =>
            sheetSession ? persistSession(sheetSession.id, payload) : Promise.resolve({ ok: false, error: 'No session' })
          }
        />
      </>
    )
  }

  return (
    <>
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8">
      {insights && insights.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/85 px-4 py-3 text-sm text-amber-950 space-y-1.5">
          <p className="font-semibold text-xs uppercase tracking-wide text-amber-900">Momentum check</p>
          <ul className="space-y-1 list-disc pl-4 text-[13px] leading-snug text-amber-950/95">
            {insights.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      <PlannerToolbarLinks />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{formatDateLong(parseDate(todayDate))}</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Today's sessions</h1>
          {weeksLeft > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{weeksLeft} week{weeksLeft !== 1 ? 's' : ''} until your exam</p>
          )}
        </div>
        <div className="relative shrink-0 mt-1">
          <Button
            variant="outline"
            onClick={() => { setShowBusyMenu(v => !v); setBusyError('') }}
            disabled={busySaving}
          >
            {markedBusy ? '✅ Marked busy' : '🚫 Mark as busy'}
          </Button>
          {showBusyMenu && (
            <div className="absolute right-0 top-10 z-50 w-52 bg-white rounded-xl border border-border shadow-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide pb-1">Today's availability</p>
              {busyError && <p className="text-xs text-red-600 px-1">{busyError}</p>}
              <button
                className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => markDayBusy('unavailable')}
                disabled={busySaving}
              >
                🚫 Fully unavailable
              </button>
              {[1, 1.5, 2].map(h => (
                <button
                  key={h}
                  className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => markDayBusy('reduced', h)}
                  disabled={busySaving}
                >
                  ⏳ Only {h}h available
                </button>
              ))}
              <button
                className="w-full text-left text-sm px-2.5 py-1.5 rounded-lg text-primary hover:bg-secondary font-medium disabled:opacity-50"
                onClick={markDayAvailable}
                disabled={busySaving}
              >
                ✅ Mark as available
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="py-5">
            <ProgressRing
              percent={todayPercent}
              size={72}
              label={`${todayPercent}%`}
              sublabel="today"
            />
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-5 flex flex-col items-center justify-center h-full gap-1">
            <div className="text-3xl font-bold text-slate-900">🔥 {streak}</div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">day streak</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-5 flex flex-col items-center justify-center h-full gap-1">
            <div className="text-3xl font-bold text-slate-900">{weeklyCompletion}%</div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions checklist */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sessions</h2>
        <p className="text-xs text-slate-400 -mt-1">
          Tap any session to log time: full block, partial minutes, or not done.
        </p>
        {activeSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            saving={savingId === session.id}
            onOpen={() => setSheetSession(session)}
          />
        ))}
        {activeSessions.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">No sessions scheduled for today.</p>
        )}
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-6 text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <p className="font-semibold text-green-800 text-lg">All done for today!</p>
          <p className="text-sm text-green-600">Great work. Rest up and come back strong tomorrow.</p>
        </div>
      )}

    </div>
    {rebuildModal}
    <SessionLogSheet
      session={sheetTarget}
      onClose={() => setSheetSession(null)}
      onSave={payload =>
        sheetSession ? persistSession(sheetSession.id, payload) : Promise.resolve({ ok: false, error: 'No session' })
      }
    />
    </>
  )
}

function SessionCard({
  session,
  saving,
  onOpen,
}: {
  session: SessionWithCompletion
  saving: boolean
  onOpen: () => void
}) {
  const planned = session.duration_minutes
  const logged =
    session.completed ? (session.completed_minutes ?? planned) : null
  const fullHit = session.completed && logged !== null && logged >= planned
  const isPartial =
    session.completed && logged !== null && logged > 0 && logged < planned
  const doneZero = session.completed && logged === 0

  return (
    <button
      type="button"
      className={`w-full flex items-center gap-4 rounded-xl border p-4 transition-all text-left cursor-pointer select-none ${
        !session.completed
          ? 'bg-white border-border hover:border-border hover:shadow-sm'
          : isPartial || doneZero
            ? 'bg-amber-50 border-amber-200'
            : fullHit
              ? 'bg-slate-50 border-green-200'
              : 'bg-slate-50 border-border'
      }`}
      onClick={onOpen}
      disabled={saving}
    >
      <div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          saving ? 'border-primary/40 animate-pulse' :
          fullHit ? 'border-green-500 bg-green-500 text-white' :
          isPartial ? 'border-amber-400 bg-amber-400 text-white' :
          doneZero ? 'border-amber-300 bg-amber-100 text-amber-900' :
          session.completed ? 'border-amber-200 bg-amber-100' :
          'border-border'
        }`}
      >
        {session.completed && (
          <svg className={`w-3.5 h-3.5 ${doneZero ? 'text-amber-900' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <SessionPill type={session.session_type} durationMinutes={session.duration_minutes} completed={session.completed} />
        {session.planner_rationale && (
          <p className="text-[11px] text-slate-600 leading-snug">{session.planner_rationale}</p>
        )}
        {session.perceived_effort != null && (
          <p className="text-[10px] text-slate-400">Effort logged: {session.perceived_effort}/5 taxing</p>
        )}
        {session.notes && (
          <p className="text-xs text-muted-foreground">{session.notes}</p>
        )}
      </div>

      <div
        className={`text-sm shrink-0 tabular-nums ${
          !session.completed
            ? 'text-slate-400'
            : isPartial || doneZero
              ? 'text-amber-800 font-medium'
              : 'text-green-700 font-medium'
        }`}
      >
        {session.completed && logged !== null ? `${logged}/${planned}m` : (
          <>
            {Math.floor(session.duration_minutes / 60) > 0 && `${Math.floor(session.duration_minutes / 60)}h `}
            {session.duration_minutes % 60 > 0 && `${session.duration_minutes % 60}m`}
          </>
        )}
      </div>
    </button>
  )
}
