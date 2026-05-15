'use client'

import { useState } from 'react'
import { Link } from '@/lib/app-link'
import { DBSession } from '@/types'
import { SESSION_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type SessionLogTarget = Pick<DBSession, 'id' | 'session_type' | 'duration_minutes'> & {
  completed: boolean
  completed_minutes?: number | null
  perceived_effort?: number | null
}

export interface SessionLogSavePayload {
  completed: boolean
  minutesCompleted: number | null
  /** 1-5 after done: how taxing it felt; optional calibration */
  perceivedEffort?: number | null
}

interface SessionLogSheetProps {
  session: SessionLogTarget | null
  onClose: () => void
  onSave: (payload: SessionLogSavePayload) => Promise<{ ok: boolean; error?: string }>
  /** Higher z-index when stacked inside another modal (e.g. day detail). */
  zClassName?: string
}

function SessionLogBody({
  session,
  onClose,
  onSave,
  zClassName,
}: {
  session: SessionLogTarget
  onClose: () => void
  onSave: SessionLogSheetProps['onSave']
  zClassName: string
}) {
  const [markDone, setMarkDone] = useState(session.completed)
  const [minutesStr, setMinutesStr] = useState(() =>
    String(
      session.completed
        ? (session.completed_minutes ?? session.duration_minutes)
        : session.duration_minutes,
    ),
  )
  const [effort, setEffort] = useState<number | ''>(
    typeof session.perceived_effort === 'number' ? session.perceived_effort : '',
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const planned = session.duration_minutes
  const label = SESSION_LABELS[session.session_type]

  async function handleSave() {
    setError('')
    const completed = markDone
    let minutesCompleted: number | null = null
    if (completed) {
      const parsed = Number(minutesStr)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Enter a valid number of minutes (0 or more).')
        return
      }
      minutesCompleted = Math.round(parsed)
    }
    setSaving(true)
    const perceivedEffort =
      completed && typeof effort === 'number' ? effort : null
    const result = await onSave({ completed, minutesCompleted, perceivedEffort })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not save. Try again.')
      return
    }
    onClose()
  }

  function setMinutes(n: number) {
    setMinutesStr(String(Math.max(0, Math.round(n))))
  }

  return (
    <div
      className={`fixed inset-0 ${zClassName} flex items-end sm:items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-log-title"
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 cursor-default border-0 p-0"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p id="session-log-title" className="text-base font-semibold text-slate-900">
              {label}
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Planned {planned}m · adjust if you did more or less
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMarkDone(false)}
              className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                !markDone
                  ? 'border-slate-800 bg-slate-50 text-slate-900'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Not done
            </button>
            <button
              type="button"
              onClick={() => setMarkDone(true)}
              className={`rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                markDone
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Done
            </button>
          </div>
          <p className="text-xs text-slate-500">
            &ldquo;Done&rdquo; includes partial work; set minutes to match how long you actually spent.
          </p>

          {markDone && (
            <div className="space-y-3">
              <Input
                label="Minutes actually spent"
                type="number"
                min={0}
                step={5}
                value={minutesStr}
                onChange={e => setMinutesStr(e.target.value)}
                hint="Less than planned still counts as progress. Use 0 if you barely started."
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setMinutes(planned)}>
                  Planned ({planned}m)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setMinutes(planned / 2)}>
                  Half (~{Math.round(planned / 2)}m)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setMinutes(Number(minutesStr || 0) - 15)}>
                  −15
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setMinutes(Number(minutesStr || 0) + 15)}>
                  +15
                </Button>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Effort check (one tap)</p>
                <p className="text-[11px] text-slate-500 leading-snug">
                  How taxing did this feel versus the time on the timer? Helps spot mismatch between stamina and perceptions.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      [1, 'Very light'],
                      [2, 'Light'],
                      [3, 'OK'],
                      [4, 'Hard'],
                      [5, 'Draining'],
                    ] as const
                  ).map(([n, lbl]) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEffort(n)}
                      className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${
                        effort === n
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold">{n}</span> {lbl}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEffort('')}
                    className="text-[11px] text-slate-400 hover:text-slate-700 underline underline-offset-2 px-2 py-2 self-center"
                  >
                    Skip
                  </button>
                </div>
              </div>
              {(() => {
                const m = Number(minutesStr)
                const partial =
                  markDone &&
                  Number.isFinite(m) &&
                  m > 0 &&
                  m < planned
                if (!partial) return null
                return (
                  <p className="text-xs text-slate-600 leading-relaxed rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                    Capture what felt hard while it&apos;s fresh.{' '}
                    <Link
                      href="/dashboard/reflect"
                      className="font-semibold text-amber-900 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-700"
                      onClick={e => e.stopPropagation()}
                    >
                      Weekly reflection
                    </Link>
                    .
                  </p>
                )
              })()}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" loading={saving} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionLogSheet({
  session,
  onClose,
  onSave,
  zClassName = 'z-[100]',
}: SessionLogSheetProps) {
  if (!session) return null
  return (
    <SessionLogBody
      key={`${session.id}:${session.completed}:${session.completed_minutes ?? ''}:${session.duration_minutes}:${session.perceived_effort ?? ''}`}
      session={session}
      onClose={onClose}
      onSave={onSave}
      zClassName={zClassName}
    />
  )
}
