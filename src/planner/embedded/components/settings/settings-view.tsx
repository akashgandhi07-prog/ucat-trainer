'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UCAT_EXAM_WINDOW_END_ISO, UCAT_EXAM_WINDOW_START_ISO, clampToUcatExamWindow } from '@/lib/ucatExamWindow'

interface SettingsViewProps {
  planId: string
  examDate: string
  examTime: string | null
  ucatSen: boolean
}

export function SettingsView({
  planId,
  examDate: initialDate,
  examTime: initialTime,
  ucatSen: initialUcatSen,
}: SettingsViewProps) {
  const [examDate, setExamDate] = useState(() => clampToUcatExamWindow(initialDate))
  const [examTime, setExamTime] = useState(initialTime ?? '')
  const [ucatSen, setUcatSen] = useState(initialUcatSen)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setExamDate(clampToUcatExamWindow(initialDate))
  }, [initialDate])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/plans/update-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          examDate,
          examTime: examTime || null,
          ucatSen,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your exam details and plan preferences</p>
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
              hint="Official UCAT running period: 13 July to 24 September 2026."
              onChange={e =>
                setExamDate(e.target.value ? clampToUcatExamWindow(e.target.value) : '')
              }
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
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={ucatSen}
                onChange={e => setUcatSen(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
          <CardTitle>Branding</CardTitle>
          <CardDescription>Powered by TheUKCATPeople</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            This planner is built and maintained by TheUKCATPeople. Need help?{' '}
            <a href="mailto:support@theukcatpeople.com" className="text-blue-600 hover:underline">
              Get in touch
            </a>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
