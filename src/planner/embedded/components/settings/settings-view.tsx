'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toISODate } from '@/lib/utils'
import { saveTimeAwayPeriods, updateExamDateTime } from '@/lib/planner-client'
import { UCAT_EXAM_WINDOW_END_ISO, UCAT_EXAM_WINDOW_START_ISO } from '../../../../lib/ucatExamWindow'
import type { TimeAwayPeriod } from '@/types'

interface SettingsViewProps {
  planId: string
  examDate: string
  examTime: string | null
  ucatSen: boolean
  timeAwayPeriods: TimeAwayPeriod[]
}

function formatRange(p: { start: string; end: string }): string {
  const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return p.start === p.end ? fmt(p.start) : `${fmt(p.start)} - ${fmt(p.end)}`
}

export function SettingsView({
  planId,
  examDate: initialDate,
  examTime: initialTime,
  ucatSen: initialUcatSen,
  timeAwayPeriods: initialTimeAway,
}: SettingsViewProps) {
  const [examDate, setExamDate] = useState(initialDate)
  const [examTime, setExamTime] = useState(initialTime ?? '')
  const [ucatSen, setUcatSen] = useState(initialUcatSen)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Time-away state
  const [timeAway, setTimeAway] = useState<TimeAwayPeriod[]>(initialTimeAway)
  const [taStart, setTaStart] = useState('')
  const [taEnd, setTaEnd] = useState('')
  const [taLabel, setTaLabel] = useState('')
  const [taKind, setTaKind] = useState<'busy' | 'holiday'>('busy')
  const [taSaving, setTaSaving] = useState(false)
  const [taSaved, setTaSaved] = useState(false)
  const [taError, setTaError] = useState('')

  const today = toISODate(new Date())

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await updateExamDateTime({
        planId,
        examDate,
        examTime: examTime || null,
        ucatSen,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function saveTimeAway(updated: TimeAwayPeriod[], regenerate = false) {
    setTaSaving(true)
    setTaSaved(false)
    setTaError('')
    try {
      const today = toISODate(new Date())
      await saveTimeAwayPeriods({
        planId,
        periods: updated,
        regenerateFromDate: regenerate ? today : undefined,
      })
      setTimeAway(updated)
      setTaSaved(true)
      setTimeout(() => setTaSaved(false), 3000)
    } catch (e: unknown) {
      setTaError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setTaSaving(false)
    }
  }

  function addTimeAway() {
    if (!taStart || !taEnd || taEnd < taStart) return
    const updated: TimeAwayPeriod[] = [
      ...timeAway,
      { start: taStart, end: taEnd, kind: taKind, label: taLabel || undefined },
    ].sort((a, b) => a.start.localeCompare(b.start))
    setTaStart(''); setTaEnd(''); setTaLabel('')
    saveTimeAway(updated, true)
  }

  function removeTimeAway(i: number) {
    const updated = timeAway.filter((_, idx) => idx !== i)
    saveTimeAway(updated, true)
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your exam details and plan preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam details</CardTitle>
          <CardDescription>
            Update your exam date or time if it changes. Updating the date will require you to regenerate your plan.
            UCATSEN changes how long full mocks are blocked for; regenerate from your plan view so future weeks pick up the new lengths.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Exam date"
              type="date"
              value={examDate}
              min={UCAT_EXAM_WINDOW_START_ISO}
              max={UCAT_EXAM_WINDOW_END_ISO}
              onChange={e => setExamDate(e.target.value)}
              hint="Official UCAT sittings: 13 Jul - 24 Sep 2026"
              required
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Exam time <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="time"
                value={examTime}
                onChange={e => setExamTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-slate-50 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={ucatSen}
                onChange={e => setUcatSen(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>
                <span className="font-medium text-slate-900">UCATSEN (extra time)</span>
                <span className="block text-sm text-slate-600 mt-1">
                  Schedule full mocks as 2h 30m. Mock reflections stay at about 2 hours.
                </span>
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            {saved && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                ✓ Exam details updated successfully.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time away</CardTitle>
          <CardDescription>
            Add holidays, festivals, or anything else that affects your availability before your exam.
            Saving will automatically regenerate your plan from today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add period form */}
          <div className="rounded-lg border border-border bg-slate-50 p-4 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaKind('busy')}
                className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all ${
                  taKind === 'busy'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-border text-muted-foreground hover:border-slate-400'
                }`}
              >
                Fully unavailable
              </button>
              <button
                type="button"
                onClick={() => setTaKind('holiday')}
                className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all ${
                  taKind === 'holiday'
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-border text-muted-foreground hover:border-slate-400'
                }`}
              >
                Holiday (more time)
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {taKind === 'busy'
                ? 'No sessions - trips, festivals, commitments.'
                : 'Free day hours applied - school holidays, time off.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <input type="date" value={taStart} min={toISODate(new Date())} max={examDate}
                  onChange={e => setTaStart(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <input type="date" value={taEnd} min={taStart || toISODate(new Date())} max={examDate}
                  onChange={e => setTaEnd(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text"
                placeholder={taKind === 'busy' ? 'Label (e.g. Festival)' : 'Label (e.g. Summer holidays)'}
                value={taLabel}
                onChange={e => setTaLabel(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <Button
                onClick={addTimeAway}
                disabled={!taStart || !taEnd || taEnd < taStart || taSaving}
                loading={taSaving}
                variant="outline"
              >
                Add & save
              </Button>
            </div>
          </div>

          {/* Existing periods */}
          {timeAway.length > 0 ? (
            <div className="space-y-2">
              {timeAway.map((p, i) => {
                const isHoliday = p.kind === 'holiday'
                return (
                  <div key={i} className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                    isHoliday ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'
                  }`}>
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-wide mr-2 ${isHoliday ? 'text-green-600' : 'text-red-400'}`}>
                        {isHoliday ? 'Holiday' : 'Blocked'}
                      </span>
                      <span className={`text-sm font-medium ${isHoliday ? 'text-green-800' : 'text-red-800'}`}>
                        {p.label || (isHoliday ? 'Holiday' : 'Unavailable')}
                      </span>
                      <span className={`text-xs ml-2 ${isHoliday ? 'text-green-600' : 'text-red-500'}`}>{formatRange(p)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTimeAway(i)}
                      disabled={taSaving}
                      className={`text-lg leading-none ml-3 transition-colors ${isHoliday ? 'text-green-400 hover:text-red-500' : 'text-red-300 hover:text-red-600'}`}
                    >×</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">No time away periods added yet.</p>
          )}

          {taError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{taError}</p>}
          {taSaved && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ Time away updated and plan regenerated.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Powered by TheUKCATPeople</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This planner is built and maintained by TheUKCATPeople. Need help?{' '}
            <a href="mailto:support@theukcatpeople.com" className="text-primary hover:underline">
              Get in touch
            </a>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
