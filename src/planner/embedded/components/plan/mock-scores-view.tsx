'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DBMockScore, MockSource } from '@/types'
import { buildMockEncouragement } from '@/lib/mock-encouragement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, parseDate, scoreColor, toISODate } from '@/lib/utils'
import { MOCK_WEAKNESS_OPTIONS } from '@/lib/mock-weaknesses'
import { addGuestMockScore, getGuestPlanner, updateGuestMockTargets } from '@/lib/guest-planner-store'
import { addMockScore, updateMockTargets } from '@/lib/planner-client'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { BarChart3, Pencil, X, Check } from 'lucide-react'
import { UCAT_APPLICATION_LINKS } from '../../../../data/ucatGuides'
import { useAppShell } from '../../../../contexts/AppShellContext'
import { appContentWidthClass } from '../../../../lib/appContentLayout'
import { cn } from '../../../../lib/cn'

interface MockScoresViewProps {
  planId: string
  mockScores: DBMockScore[]
  readOnly?: boolean
  browseOnly?: boolean
  initialTargetTotal?: number | null
  initialTargetSjtBand?: number | null
  guestMode?: boolean
}

const MOCK_SOURCES: { value: MockSource; label: string }[] = [
  { value: 'medify', label: 'Medify' },
  { value: 'medentry', label: 'MedEntry' },
  { value: 'passmedicine', label: 'Passmedicine' },
  { value: 'book', label: 'A Book' },
  { value: 'official', label: 'Official Mock' },
]

const SOURCE_LABELS: Record<MockSource, string> = {
  medify: 'Medify',
  medentry: 'MedEntry',
  passmedicine: 'Passmedicine',
  book: 'Book',
  official: 'Official',
}

function meanRound(nums: number[]): number | null {
  if (nums.length === 0) return null
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function computeMockTabStats(list: DBMockScore[]) {
  if (list.length === 0) return null

  const vr = list.map(s => s.score_vr).filter((n): n is number => n != null)
  const dm = list.map(s => s.score_dm).filter((n): n is number => n != null)
  const qr = list.map(s => s.score_qr).filter((n): n is number => n != null)

  const totals: number[] = []
  for (const s of list) {
    const parts = [s.score_vr, s.score_dm, s.score_qr].filter(Boolean) as number[]
    if (parts.length > 0) totals.push(parts.reduce((a, b) => a + b, 0))
  }

  const sjtBands = list.map(s => s.score_sjt).filter((n): n is number => n != null)
  let latestSjt: number | null = null
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].score_sjt != null) {
      latestSjt = list[i].score_sjt!
      break
    }
  }
  const bestSjt = sjtBands.length > 0 ? Math.min(...sjtBands) : null

  // For full mocks every entry has all 3 sections so /2700 is correct.
  // For mini mocks sections vary per entry - combined totals are not comparable.
  const allHaveAllThree = list.every(
    s => s.score_vr != null && s.score_dm != null && s.score_qr != null,
  )

  return {
    count: list.length,
    avgVr: meanRound(vr),
    avgDm: meanRound(dm),
    avgQr: meanRound(qr),
    avgTotal: allHaveAllThree ? meanRound(totals) : null,
    bestTotal: allHaveAllThree ? (totals.length > 0 ? Math.max(...totals) : null) : null,
    bestSjt,
    latestSjt,
  }
}

type Tab = 'full' | 'mini'

export function MockScoresView({
  planId,
  mockScores: initialScores,
  readOnly,
  browseOnly = false,
  initialTargetTotal = null,
  initialTargetSjtBand = null,
  guestMode = false,
}: MockScoresViewProps) {
  const inAppShell = useAppShell()
  const formSectionRef = useRef<HTMLDivElement>(null)
  const propsFingerprint = useMemo(
    () =>
      `${planId}|${initialTargetTotal ?? ''}|${initialTargetSjtBand ?? ''}|${initialScores.map(s => s.id).join(',')}`,
    [planId, initialTargetTotal, initialTargetSjtBand, initialScores],
  )

  const [appliedFingerprint, setAppliedFingerprint] = useState(propsFingerprint)
  const [scores, setScores] = useState(initialScores)
  const [targetTotalSaved, setTargetTotalSaved] = useState<number | null>(initialTargetTotal ?? null)
  const [targetSjtSaved, setTargetSjtSaved] = useState<number | null>(initialTargetSjtBand ?? null)

  // Inline target editing
  const [editingTarget, setEditingTarget] = useState(false)
  const [totalInput, setTotalInput] = useState(
    () => (initialTargetTotal != null ? String(initialTargetTotal) : ''),
  )
  const [sjtInput, setSjtInput] = useState(
    () => (initialTargetSjtBand != null ? String(initialTargetSjtBand) : ''),
  )
  const [targetSaving, setTargetSaving] = useState(false)
  const [targetError, setTargetError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('full')
  const [form, setForm] = useState({
    mockDate: toISODate(new Date()),
    vr: '', dm: '', qr: '', sjt: '' as string,
    mockType: 'full' as Tab,
    mockSource: '' as MockSource | '',
    weaknessTags: [] as string[],
  })

  function openTargetEdit() {
    setTotalInput(targetTotalSaved != null ? String(targetTotalSaved) : '')
    setSjtInput(targetSjtSaved != null ? String(targetSjtSaved) : '')
    setTargetError(null)
    setEditingTarget(true)
  }

  function cancelTargetEdit() {
    setTotalInput(targetTotalSaved != null ? String(targetTotalSaved) : '')
    setSjtInput(targetSjtSaved != null ? String(targetSjtSaved) : '')
    setTargetError(null)
    setEditingTarget(false)
  }

  function toggleLogForm() {
    setShowForm((open) => {
      const next = !open
      if (next) {
        requestAnimationFrame(() => {
          formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      return next
    })
  }

  function toggleWeakness(id: string) {
    setForm(f => ({
      ...f,
      weaknessTags: f.weaknessTags.includes(id)
        ? f.weaknessTags.filter(x => x !== id)
        : [...f.weaknessTags, id],
    }))
  }

  const encouragement = useMemo(
    () =>
      scores.length ? buildMockEncouragement(scores, targetTotalSaved, targetSjtSaved) : null,
    [scores, targetTotalSaved, targetSjtSaved],
  )

  async function handleSaveTargets(e?: React.FormEvent) {
    e?.preventDefault()
    setTargetError(null)
    const trimmedTotal = totalInput.trim()
    const trimmedSjt = sjtInput.trim()
    let mockTargetTotal: number | null = null
    let mockTargetSjtBand: number | null = null
    if (trimmedTotal !== '') {
      const n = Number(trimmedTotal)
      if (!Number.isInteger(n) || n < 900 || n > 2700) {
        setTargetError('Combined total must be 900-2700.')
        return
      }
      mockTargetTotal = n
    }
    if (trimmedSjt !== '') {
      const n = Number(trimmedSjt)
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        setTargetError('SJT band must be 1-4.')
        return
      }
      mockTargetSjtBand = n
    }

    setTargetSaving(true)
    try {
      if (guestMode) {
        if (!getGuestPlanner()) {
          setTargetError('No study plan on this device.')
          return
        }
        updateGuestMockTargets(mockTargetTotal, mockTargetSjtBand)
      } else {
        await updateMockTargets({ planId, mockTargetTotal, mockTargetSjtBand })
      }
      setTargetTotalSaved(mockTargetTotal)
      setTargetSjtSaved(mockTargetSjtBand)
      setEditingTarget(false)
    } catch (e) {
      setTargetError(e instanceof Error ? e.message : 'Could not save target')
    } finally {
      setTargetSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let saved: DBMockScore
      if (guestMode) {
        saved = addGuestMockScore({
          plan_id: planId,
          student_id: 'guest',
          session_id: null,
          logged_date: form.mockDate,
          week_number: null,
          score_vr: form.vr ? Number(form.vr) : null,
          score_dm: form.dm ? Number(form.dm) : null,
          score_qr: form.qr ? Number(form.qr) : null,
          score_sjt: form.sjt ? Number(form.sjt) : null,
          mock_type: form.mockType,
          mock_source: form.mockSource || null,
          weakness_tags: form.weaknessTags,
        })
      } else {
        const row = await addMockScore({
          planId,
          mockDate: form.mockDate,
          mockType: form.mockType,
          scoreVr: form.vr ? Number(form.vr) : null,
          scoreDm: form.dm ? Number(form.dm) : null,
          scoreQr: form.qr ? Number(form.qr) : null,
          scoreSjt: form.sjt ? Number(form.sjt) : null,
          mockSource: form.mockSource || null,
          weaknessTags: form.weaknessTags,
        })
        saved = row as DBMockScore
      }

      setScores(prev => [...prev, saved].sort((a, b) =>
        a.logged_date.localeCompare(b.logged_date)
      ))
      setShowForm(false)
      setActiveTab(form.mockType)
      setForm(f => ({ ...f, vr: '', dm: '', qr: '', sjt: '', mockSource: '', weaknessTags: [] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mock score')
    } finally {
      setLoading(false)
    }
  }

  const fullScores = scores.filter(s => s.mock_type === 'full')
  const miniScores = scores.filter(s => s.mock_type === 'mini')
  const displayed = activeTab === 'full' ? fullScores : miniScores

  function buildChartData(list: DBMockScore[]) {
    return list.map((s, i) => {
      const mainScores = [s.score_vr, s.score_dm, s.score_qr].filter(Boolean) as number[]
      const total = mainScores.length === 3 ? mainScores.reduce((a, b) => a + b, 0) : undefined
      return {
        name: formatDate(parseDate(s.logged_date)),
        idx: i + 1,
        VR: s.score_vr ?? undefined,
        DM: s.score_dm ?? undefined,
        QR: s.score_qr ?? undefined,
        SJT: s.score_sjt ?? undefined,
        TOTAL: total,
      }
    })
  }

  const chartDataFull = buildChartData(fullScores)
  const chartDataMini = buildChartData(miniScores)
  const chartData = activeTab === 'full' ? chartDataFull : chartDataMini

  const tabStats = useMemo(() => {
    const list = scores.filter(s => s.mock_type === activeTab)
    return computeMockTabStats(list)
  }, [scores, activeTab])

  useEffect(() => {
    if (propsFingerprint === appliedFingerprint) return
    setAppliedFingerprint(propsFingerprint)
    setScores(initialScores)
    const t = initialTargetTotal ?? null
    const b = initialTargetSjtBand ?? null
    setTargetTotalSaved(t)
    setTargetSjtSaved(b)
    setTotalInput(t != null ? String(t) : '')
    setSjtInput(b != null ? String(b) : '')
  }, [
    propsFingerprint,
    appliedFingerprint,
    initialScores,
    initialTargetTotal,
    initialTargetSjtBand,
  ])

  const hasTarget = targetTotalSaved != null || targetSjtSaved != null

  return (
    <div
      className={cn(
        'px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8',
        appContentWidthClass({ inAppShell }),
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Mock Scores</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Track your progress across full and mini mocks
            </p>
          </div>

          {/* Inline target */}
          {!readOnly && (
            <div className="flex items-center gap-2 min-h-[28px]">
              {editingTarget ? (
                <form
                  onSubmit={handleSaveTargets}
                  className="flex flex-wrap items-center gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Target (VR+DM+QR):</label>
                    <input
                      type="number"
                      min={900}
                      max={2700}
                      step={10}
                      placeholder="e.g. 2100"
                      value={totalInput}
                      onChange={e => { setTotalInput(e.target.value); setTargetError(null) }}
                      className="w-24 h-7 rounded border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-400">/ 2700</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-500">SJT:</label>
                    <select
                      value={sjtInput}
                      onChange={e => { setSjtInput(e.target.value); setTargetError(null) }}
                      className="h-7 rounded border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Any band</option>
                      <option value="1">Band 1</option>
                      <option value="2">Band 2</option>
                      <option value="3">Band 3</option>
                      <option value="4">Band 4</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="submit"
                      disabled={targetSaving}
                      className="flex items-center gap-1 h-7 rounded bg-blue-600 px-2.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check size={11} />
                      {targetSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelTargetEdit}
                      className="flex items-center gap-1 h-7 rounded border border-slate-200 bg-white px-2.5 text-xs text-slate-500 hover:bg-slate-50"
                    >
                      <X size={11} />
                      Cancel
                    </button>
                  </div>
                  {targetError && (
                    <p className="w-full text-xs text-red-600">{targetError}</p>
                  )}
                </form>
              ) : (
                <button
                  type="button"
                  onClick={openTargetEdit}
                  className="group flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                >
                  {hasTarget ? (
                    <>
                      <span className="font-medium text-slate-700">
                        {targetTotalSaved != null && `${targetTotalSaved}/2700`}
                        {targetTotalSaved != null && targetSjtSaved != null && ' · '}
                        {targetSjtSaved != null && `SJT Band ${targetSjtSaved}`}
                      </span>
                      <span className="text-slate-400">target</span>
                    </>
                  ) : (
                    <span>+ Set target</span>
                  )}
                  <Pencil size={10} className="opacity-50 group-hover:opacity-100" />
                </button>
              )}
            </div>
          )}

          {/* Read-only target display */}
          {readOnly && hasTarget && (
            <p className="text-sm text-slate-600">
              {targetTotalSaved != null && (
                <span>Target <span className="font-semibold text-slate-900">{targetTotalSaved}</span> / 2700</span>
              )}
              {targetTotalSaved != null && targetSjtSaved != null && ' · '}
              {targetSjtSaved != null && (
                <span>SJT Band <span className="font-semibold text-slate-900">{targetSjtSaved}</span></span>
              )}
            </p>
          )}

          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 sm:px-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            <span className="sm:hidden">
              Raw marks? Convert with the{' '}
              <a
                href={UCAT_APPLICATION_LINKS.scoreCalculator.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                UCAT score calculator
              </a>{' '}
              (scaled 300-900 per section) before logging.
            </span>
            <span className="hidden sm:inline">
              If you only have raw marks, use the{' '}
              <a
                href={UCAT_APPLICATION_LINKS.scoreCalculator.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                UCAT score calculator
              </a>
              {' at The UKCAT People to convert them to scaled scores (300-900 per section) before logging.'}
            </span>
          </div>
        </div>

        {!readOnly && (
          <Button
            type="button"
            onClick={toggleLogForm}
            variant={showForm ? 'secondary' : 'primary'}
            className="w-full shrink-0 sm:w-auto"
          >
            {showForm ? 'Cancel' : '+ Log scores'}
          </Button>
        )}
      </div>

      {/* Log form */}
      {showForm && !readOnly && (
        <div ref={formSectionRef} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Log mock scores</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={form.mockDate}
                      max={toISODate(new Date())}
                      onChange={e => setForm(f => ({ ...f, mockDate: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mock type</label>
                    <select
                      value={form.mockType}
                      onChange={e => setForm(f => ({ ...f, mockType: e.target.value as Tab }))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full">Full mock</option>
                      <option value="mini">Mini mock</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Source</label>
                    <select
                      value={form.mockSource}
                      onChange={e => setForm(f => ({ ...f, mockSource: e.target.value as MockSource | '' }))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">- Select source -</option>
                      {MOCK_SOURCES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Input
                    label="VR (300-900)"
                    type="number" min={300} max={900} step={10}
                    placeholder="e.g. 650"
                    value={form.vr}
                    onChange={e => setForm(f => ({ ...f, vr: e.target.value }))}
                  />
                  <Input
                    label="DM (300-900)"
                    type="number" min={300} max={900} step={10}
                    placeholder="e.g. 650"
                    value={form.dm}
                    onChange={e => setForm(f => ({ ...f, dm: e.target.value }))}
                  />
                  <Input
                    label="QR (300-900)"
                    type="number" min={300} max={900} step={10}
                    placeholder="e.g. 650"
                    value={form.qr}
                    onChange={e => setForm(f => ({ ...f, qr: e.target.value }))}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">SJT Band</label>
                    <select
                      value={form.sjt}
                      onChange={e => setForm(f => ({ ...f, sjt: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">- Band -</option>
                      <option value="1">Band 1 (best)</option>
                      <option value="2">Band 2</option>
                      <option value="3">Band 3</option>
                      <option value="4">Band 4</option>
                    </select>
                  </div>
                </div>

                {form.mockType === 'mini' && (
                  <p className="text-xs text-slate-400">
                    For a mini mock, only fill in the sections you practised.
                  </p>
                )}

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Where did you leak marks?</p>
                  <p className="text-xs text-slate-500 mb-2">
                    Tick every area that felt weakest; future blocks get nudged that way alongside section scores.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_WEAKNESS_OPTIONS.map(opt => {
                      const on = form.weaknessTags.includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleWeakness(opt.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                            on
                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <Button type="submit" loading={loading}>Save scores</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Encouragement */}
      {encouragement && (
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/80 to-white">
          <CardContent className="pt-6 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Momentum</p>
            <p className="text-sm text-slate-700 leading-relaxed">{encouragement}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex w-full gap-2 sm:w-auto sm:max-w-xl">
        {(['full', 'mini'] as Tab[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors flex-1 min-w-[10rem] sm:flex-initial sm:min-w-0 ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab === 'full' ? 'Full Mocks' : 'Mini Mocks'}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
              activeTab === tab ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab === 'full' ? fullScores.length : miniScores.length}
            </span>
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {tabStats && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-base">
                {activeTab === 'full' ? 'Full mock' : 'Mini mock'} summary
              </CardTitle>
              <span className="text-xs text-slate-400 shrink-0">
                {tabStats.count} {tabStats.count === 1 ? 'mock' : 'mocks'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Combined totals row */}
            {(tabStats.avgTotal != null || tabStats.bestTotal != null) && (
              <div className="grid grid-cols-2 gap-3">
                {tabStats.avgTotal != null && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Avg combined</p>
                    <p className="text-2xl font-bold tabular-nums text-slate-900 leading-none">
                      {tabStats.avgTotal}
                      <span className="text-sm font-normal text-slate-400 ml-1">/ 2700</span>
                    </p>
                  </div>
                )}
                {tabStats.bestTotal != null && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">Best combined</p>
                    <p className="text-2xl font-bold tabular-nums text-slate-900 leading-none">
                      {tabStats.bestTotal}
                      <span className="text-sm font-normal text-slate-400 ml-1">/ 2700</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            {/* Per-section row */}
            {(tabStats.avgVr != null || tabStats.avgDm != null || tabStats.avgQr != null || tabStats.bestSjt != null) && (
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 border-t border-slate-100 pt-4">
                {tabStats.avgVr != null && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">VR avg</dt>
                    <dd className="text-xl font-semibold tabular-nums text-slate-900 mt-0.5 leading-none">
                      {tabStats.avgVr}
                      <span className="text-xs font-normal text-slate-400 ml-0.5">/ 900</span>
                    </dd>
                  </div>
                )}
                {tabStats.avgDm != null && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">DM avg</dt>
                    <dd className="text-xl font-semibold tabular-nums text-slate-900 mt-0.5 leading-none">
                      {tabStats.avgDm}
                      <span className="text-xs font-normal text-slate-400 ml-0.5">/ 900</span>
                    </dd>
                  </div>
                )}
                {tabStats.avgQr != null && (
                  <div>
                    <dt className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">QR avg</dt>
                    <dd className="text-xl font-semibold tabular-nums text-slate-900 mt-0.5 leading-none">
                      {tabStats.avgQr}
                      <span className="text-xs font-normal text-slate-400 ml-0.5">/ 900</span>
                    </dd>
                  </div>
                )}
                {tabStats.bestSjt != null &&
                  (tabStats.latestSjt != null && tabStats.latestSjt !== tabStats.bestSjt ? (
                    <>
                      <div>
                        <dt className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">SJT best</dt>
                        <dd className="text-xl font-semibold text-slate-900 mt-0.5 leading-none">
                          Band {tabStats.bestSjt}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">SJT latest</dt>
                        <dd className="text-xl font-semibold text-slate-900 mt-0.5 leading-none">
                          Band {tabStats.latestSjt}
                        </dd>
                      </div>
                    </>
                  ) : (
                    <div>
                      <dt className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">SJT band</dt>
                      <dd className="text-xl font-semibold text-slate-900 mt-0.5 leading-none">
                        Band {tabStats.bestSjt}
                      </dd>
                    </div>
                  ))}
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section progression charts */}
      {chartData.length > 1 &&
        chartData.some(d => d.VR || d.DM || d.QR || d.SJT != null || d.TOTAL != null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            { key: 'VR', color: '#3b82f6', label: 'Verbal Reasoning', kind: 'section' as const },
            { key: 'DM', color: '#22c55e', label: 'Decision Making', kind: 'section' as const },
            { key: 'QR', color: '#f59e0b', label: 'Quantitative Reasoning', kind: 'section' as const },
            { key: 'SJT', color: '#a855f7', label: 'Situational Judgement', kind: 'sjt' as const },
            // TOTAL chart only shown for full mocks (all 3 sections present)
            ...(activeTab === 'full'
              ? [{ key: 'TOTAL' as const, color: '#475569', label: 'VR + DM + QR total', kind: 'total' as const }]
              : []),
          ] as const).map(({ key, color, label, kind }) => {
            const hasData = chartData.some(d => (d as Record<string, unknown>)[key] !== undefined)
            if (!hasData) return null
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold" style={{ color }}>{label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 10,
                        left: kind === 'section' ? -12 : 4,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="idx" tick={{ fontSize: 10 }} tickFormatter={v => `#${v}`} />
                      {kind === 'section' && (
                        <YAxis domain={[300, 900]} tick={{ fontSize: 10 }} width={44} />
                      )}
                      {kind === 'sjt' && (
                        <YAxis
                          domain={[1, 4]}
                          ticks={[1, 2, 3, 4]}
                          reversed
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          width={40}
                        />
                      )}
                      {kind === 'total' && (
                        <YAxis
                          domain={[900, 2700]}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickCount={5}
                          width={44}
                        />
                      )}
                      <Tooltip
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
                        formatter={(v) => {
                          if (kind === 'sjt') return [`Band ${v as number}`, 'SJT']
                          if (kind === 'total') return [`${v as number} / 2700`, 'Total']
                          return [v as number, key]
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Scores table */}
      {displayed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{activeTab === 'full' ? 'Full Mock' : 'Mini Mock'} Scores</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wide">VR</th>
                  <th className="px-4 py-3 text-xs font-semibold text-green-500 uppercase tracking-wide">DM</th>
                  <th className="px-4 py-3 text-xs font-semibold text-amber-500 uppercase tracking-wide">QR</th>
                  <th className="px-4 py-3 text-xs font-semibold text-purple-500 uppercase tracking-wide">SJT</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...displayed].reverse().map(score => {
                  const mainScores = [score.score_vr, score.score_dm, score.score_qr].filter(Boolean) as number[]
                  const total = mainScores.length > 0 ? mainScores.reduce((a, b) => a + b, 0) : null
                  const maxOut = mainScores.length * 900
                  const avg = total !== null ? Math.round(total / mainScores.length) : null
                  return (
                    <tr key={score.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-700 font-medium">
                        {formatDate(parseDate(score.logged_date))}
                      </td>
                      <td className="px-4 py-3">
                        {score.mock_source ? (
                          <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                            {SOURCE_LABELS[score.mock_source]}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(score.score_vr, 'vr')}`}>
                        {score.score_vr ?? '-'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(score.score_dm, 'dm')}`}>
                        {score.score_dm ?? '-'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(score.score_qr, 'qr')}`}>
                        {score.score_qr ?? '-'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${scoreColor(score.score_sjt, 'sjt')}`}>
                        {score.score_sjt ? `Band ${score.score_sjt}` : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {total ?? '-'}
                        {total !== null && (
                          <span className="ml-1 text-xs font-normal text-slate-400">/ {maxOut}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {avg ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="text-center py-12 sm:py-16 px-2 text-slate-400">
          <div className="mx-auto mb-3 flex justify-center" aria-hidden>
            <BarChart3 className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm sm:text-base text-slate-500">
            No {activeTab === 'full' ? 'full' : 'mini'} mock scores logged yet.
          </p>
          {!readOnly && (
            <p className="text-xs sm:text-sm mt-2 text-slate-400">
              After completing a mock, log your scores using the button above.
            </p>
          )}
          {readOnly && browseOnly && (
            <p className="text-xs sm:text-sm mt-2 text-slate-500">
              Register for free to log mocks and track progress here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
