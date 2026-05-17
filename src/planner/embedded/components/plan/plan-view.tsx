'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/app-navigation'
import { DBPlan, DBPlanWeek, DBPlanDay, DBSession, SessionType } from '@/types'
import { SessionPill } from '@/components/ui/badge'
import { addDays, formatDate, parseDate, toISODate, DAY_NAMES } from '@/lib/utils'

interface SessionWithCompletion extends DBSession {
  completed: boolean
}

interface PlanViewProps {
  plan: DBPlan
  planWeeks: DBPlanWeek[]
  planDays: DBPlanDay[]
  sessions: SessionWithCompletion[]
  canEdit: boolean
  readOnly?: boolean
  todayDate: string
}

// ─── Day edit popover ─────────────────────────────────────────────────────────

function DayEditPopover({
  planId,
  dayDate,
  currentAvailability,
  currentHours,
  onUpdate,
  onClose,
}: {
  planId: string
  dayDate: string
  currentAvailability: 'available' | 'reduced' | 'unavailable'
  currentHours: number | null
  onUpdate: (dayDate: string, availability: 'available' | 'reduced' | 'unavailable', isRest: boolean, hours?: number | null) => void
  onClose: () => void
}) {
  const router = useRouter()
  const [availability, setAvailability] = useState(currentAvailability)
  const [hours, setHours] = useState(currentHours?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/days/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          dayDate,
          availability,
          customHours: availability === 'reduced' && hours ? Number(hours) : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to update day')
      await router.refresh()
      onUpdate(
        dayDate,
        availability,
        availability === 'unavailable',
        availability === 'reduced' && hours ? Number(hours) : null,
      )
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="absolute z-50 top-6 left-0 w-52 bg-white rounded-xl border border-slate-200 shadow-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Edit day</p>

      <div className="space-y-1.5">
        {([
          { value: 'available', label: 'Available', icon: '✅' },
          { value: 'reduced', label: 'Reduced hours', icon: '⏳' },
          { value: 'unavailable', label: 'Busy / unavailable', icon: '🚫' },
        ] as const).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setAvailability(opt.value)}
            className={`w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
              availability === opt.value
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="mr-1.5">{opt.icon}</span>{opt.label}
          </button>
        ))}
      </div>

      {availability === 'reduced' && (
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Hours available</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0.5}
              max={8}
              step={0.5}
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full h-8 rounded-lg border border-slate-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400 shrink-0">h</span>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 text-xs text-slate-500 hover:text-slate-700 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Custom week hours editor ─────────────────────────────────────────────────

function WeekHoursEditor({
  weekId,
  currentHours,
  planDefaultHours,
  onDone,
}: {
  weekId: string
  currentHours: number
  /** Plan-level default so we can offer a reset option */
  planDefaultHours: number
  onDone: () => void
}) {
  const router = useRouter()
  const [value, setValue] = useState(String(currentHours))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function post(customHours: number | null) {
    setBusy(true)
    setErr('')
    try {
      const res = await fetch(`/api/plans/weeks/${weekId}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customHours }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      router.refresh()
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    const h = Number(value)
    if (!Number.isFinite(h) || h < 0.5 || h > 12) {
      setErr('Enter a value between 0.5 and 12')
      return
    }
    await post(h)
  }

  const isCustom = currentHours !== planDefaultHours

  return (
    <div className="flex flex-col items-end gap-0.5" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0.5}
          max={12}
          step={0.5}
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          className="w-16 h-7 rounded-md border border-slate-300 px-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-slate-400">h/day</span>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? '…' : '✓'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-slate-400 hover:text-slate-600 px-1 py-1"
        >
          ✕
        </button>
      </div>
      {isCustom && (
        <button
          type="button"
          onClick={() => post(null)}
          disabled={busy}
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 disabled:opacity-50"
        >
          Reset to plan default ({planDefaultHours}h)
        </button>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}

// ─── Main plan view ───────────────────────────────────────────────────────────

export function PlanView({ plan, planWeeks, planDays, sessions, canEdit, readOnly = false, todayDate }: PlanViewProps) {
  const daysByDate = new Map<string, DBPlanDay>()
  for (const d of planDays) daysByDate.set(d.day_date, d)

  const sessionsByDate = new Map<string, SessionWithCompletion[]>()
  for (const s of sessions) {
    const list = sessionsByDate.get(s.day_date) ?? []
    list.push(s)
    sessionsByDate.set(s.day_date, list)
  }

  // Local override state for day availability changes (without full page reload)
  const [dayOverrides, setDayOverrides] = useState<Map<string, {
    availability: 'available' | 'reduced' | 'unavailable'
    isRest: boolean
    hours: number | null
  }>>(new Map())

  const [editingDate, setEditingDate] = useState<string | null>(null)

  function handleDayUpdate(
    dayDate: string,
    availability: 'available' | 'reduced' | 'unavailable',
    isRest: boolean,
    hours?: number | null,
  ) {
    setDayOverrides(prev => {
      const next = new Map(prev)
      next.set(dayDate, { availability, isRest, hours: hours ?? null })
      return next
    })
  }

  const today = new Date(todayDate)
  const currentWeekNumber = planWeeks.find(w => {
    const ws = parseDate(w.week_start)
    const we = addDays(ws, 6)
    return today >= ws && today <= we
  })?.week_number

  const [openWeeks, setOpenWeeks] = useState<Set<number>>(
    new Set(currentWeekNumber ? [currentWeekNumber] : [planWeeks[0]?.week_number ?? 1])
  )
  const [editingWeekHours, setEditingWeekHours] = useState<string | null>(null)

  function toggleWeek(weekNum: number) {
    setOpenWeeks(prev => {
      const next = new Set(prev)
      if (next.has(weekNum)) next.delete(weekNum)
      else next.add(weekNum)
      return next
    })
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Revision Plan</h1>
        <p className="text-slate-500 mt-1">
          Exam: {parseDate(plan.exam_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {plan.exam_time && <span className="ml-2 text-slate-400">at {plan.exam_time}</span>}
        </p>
      </div>

      {/* Session legend */}
      <div className="flex flex-wrap gap-2">
        {(['vr_practice', 'dm_practice', 'qr_practice', 'sjt_practice', 'full_mock', 'mini_mock', 'reflection'] as SessionType[]).map(t => (
          <SessionPill key={t} type={t} />
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {planWeeks.map(week => {
          const ws = parseDate(week.week_start)
          const we = addDays(ws, 6)
          const isOpen = openWeeks.has(week.week_number)
          const isCurrent = week.week_number === currentWeekNumber
          const isPast = we < today

          const weekDays: { date: Date; dateStr: string }[] = []
          for (let i = 0; i < 7; i++) {
            const d = addDays(ws, i)
            if (d > parseDate(plan.exam_date)) break
            weekDays.push({ date: d, dateStr: toISODate(d) })
          }

          const weekSessions = weekDays.flatMap(({ dateStr }) =>
            (sessionsByDate.get(dateStr) ?? []).filter(s => s.session_type !== 'rest')
          )
          const completedSessions = weekSessions.filter(s => s.completed)
          const totalMinutes = weekSessions.reduce((a, s) => a + s.duration_minutes, 0)
          const mocksCount = weekSessions.filter(s =>
            s.session_type === 'full_mock' || s.session_type === 'mini_mock'
          ).length
          const completionPercent = weekSessions.length > 0
            ? Math.round((completedSessions.length / weekSessions.length) * 100)
            : 0

          return (
            <div
              key={week.id}
              className={`rounded-xl border bg-white overflow-hidden transition-all ${
                isCurrent ? 'border-blue-300 shadow-sm shadow-blue-100' : 'border-slate-200'
              }`}
            >
              {/* Week header */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => toggleWeek(week.week_number)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">Week {week.week_number}</span>
                    {isCurrent && (
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">Current</span>
                    )}
                    {isPast && (
                      <span className="text-xs font-medium bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">Past</span>
                    )}
                    <span className="text-xs text-slate-400 capitalize">{week.week_type}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatDate(ws)} - {formatDate(we)}
                  </p>
                </div>
                <div className="flex items-center gap-5 shrink-0 text-sm">
                  <div className="text-center hidden sm:block">
                    {canEdit && !readOnly && !isPast && editingWeekHours === week.id ? (
                      <WeekHoursEditor
                        weekId={week.id}
                        currentHours={week.default_hours}
                        planDefaultHours={plan.school_day_hours}
                        onDone={() => setEditingWeekHours(null)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); if (canEdit && !readOnly && !isPast) setEditingWeekHours(week.id) }}
                        title={canEdit && !readOnly && !isPast ? 'Click to set custom hours for this week' : undefined}
                        className={canEdit && !readOnly && !isPast ? 'hover:text-blue-600 transition-colors' : ''}
                      >
                        <div className="font-semibold text-slate-900">{(totalMinutes / 60).toFixed(1)}h</div>
                        <div className="text-xs text-slate-400">
                          planned{canEdit && !readOnly && !isPast ? ' ✎' : ''}
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="font-semibold text-slate-900">{mocksCount}</div>
                    <div className="text-xs text-slate-400">mock{mocksCount !== 1 ? 's' : ''}</div>
                  </div>
                  {isPast && (
                    <div className="text-center">
                      <div className={`font-semibold ${completionPercent >= 80 ? 'text-green-600' : completionPercent >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {completionPercent}%
                      </div>
                      <div className="text-xs text-slate-400">done</div>
                    </div>
                  )}
                  <span className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {/* Week body */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {week.tutor_note && (
                    <div className="mx-4 my-3 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-800">
                      <span className="font-semibold">Tutor note:</span> {week.tutor_note}
                    </div>
                  )}
                  {canEdit && !readOnly && (
                    <p className="text-xs text-slate-400 px-4 pt-3 pb-1">
                      Click the pencil on any day to mark it as busy or reduce hours.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    {weekDays.map(({ date, dateStr }) => {
                      const override = dayOverrides.get(dateStr)
                      const day = override
                        ? { ...daysByDate.get(dateStr), is_rest: override.isRest, availability: override.availability }
                        : daysByDate.get(dateStr)

                      const daySessions = (sessionsByDate.get(dateStr) ?? []).filter(s => s.session_type !== 'rest')
                      const isToday = dateStr === todayDate
                      const isRestDay = override ? override.isRest : (day?.is_rest ?? false)
                      const isEditing = editingDate === dateStr

                      return (
                        <div
                          key={dateStr}
                          className={`relative p-3 min-h-[90px] ${isToday ? 'bg-blue-50/60' : ''} ${isRestDay ? 'bg-stone-50' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                              {DAY_NAMES[date.getDay()]}
                              <span className="ml-1 font-normal">{date.getDate()}</span>
                              {isToday && <span className="ml-1 text-blue-500">•</span>}
                            </div>
                            {canEdit && !readOnly && (
                              <button
                                type="button"
                                title="Edit day"
                                onClick={() => setEditingDate(isEditing ? null : dateStr)}
                                className={`text-xs leading-none p-0.5 rounded transition-colors ${
                                  isEditing
                                    ? 'text-blue-600'
                                    : 'text-slate-300 hover:text-slate-500'
                                }`}
                              >
                                ✏️
                              </button>
                            )}
                          </div>

                          {isEditing && (
                            <DayEditPopover
                              planId={plan.id}
                              dayDate={dateStr}
                              currentAvailability={(day?.availability as any) ?? 'available'}
                              currentHours={override?.hours ?? (day as any)?.custom_hours ?? null}
                              onUpdate={handleDayUpdate}
                              onClose={() => setEditingDate(null)}
                            />
                          )}

                          {isRestDay ? (
                            <span className="text-xs text-stone-400 italic">
                              {override?.availability === 'unavailable' ? 'Busy' : 'Rest'}
                            </span>
                          ) : daySessions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {daySessions.map(s => (
                                <SessionPill
                                  key={s.id}
                                  type={s.session_type}
                                  completed={s.completed}
                                  className="text-xs py-0.5 px-1.5"
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
