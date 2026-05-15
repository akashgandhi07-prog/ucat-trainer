'use client'

import { useMemo, useState } from 'react'
import { DBMockScore, MockSource } from '@/types'
import { buildMockEncouragement } from '@/lib/mock-encouragement'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, parseDate, scoreColor, toISODate } from '@/lib/utils'
import { MOCK_WEAKNESS_OPTIONS } from '@/lib/mock-weaknesses'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface MockScoresViewProps {
  planId: string
  mockScores: DBMockScore[]
  readOnly?: boolean
  /** Goal VR+DM+QR combined total out of 2700. */
  initialTargetTotal?: number | null
  /** Goal SJT band (1 = strongest in-app convention). */
  initialTargetSjtBand?: number | null
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

/** Summary stats for one mock type tab (list is chronological, oldest first). */
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

  return {
    count: list.length,
    avgVr: meanRound(vr),
    avgDm: meanRound(dm),
    avgQr: meanRound(qr),
    avgTotal: meanRound(totals),
    bestTotal: totals.length > 0 ? Math.max(...totals) : null,
    bestSjt,
    latestSjt,
  }
}

type Tab = 'full' | 'mini'

export function MockScoresView({
  planId,
  mockScores: initialScores,
  readOnly,
  initialTargetTotal = null,
  initialTargetSjtBand = null,
}: MockScoresViewProps) {
  const propsFingerprint = useMemo(
    () =>
      `${planId}|${initialTargetTotal ?? ''}|${initialTargetSjtBand ?? ''}|${initialScores.map(s => s.id).join(',')}`,
    [planId, initialTargetTotal, initialTargetSjtBand, initialScores],
  )

  const [appliedFingerprint, setAppliedFingerprint] = useState(propsFingerprint)

  const [scores, setScores] = useState(initialScores)
  const [targetTotalSaved, setTargetTotalSaved] = useState<number | null>(initialTargetTotal ?? null)
  const [targetSjtSaved, setTargetSjtSaved] = useState<number | null>(initialTargetSjtBand ?? null)
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

  async function handleSaveTargets() {
    setTargetError(null)
    const trimmedTotal = totalInput.trim()
    const trimmedSjt = sjtInput.trim()
    let mockTargetTotal: number | null = null
    let mockTargetSjtBand: number | null = null
    if (trimmedTotal !== '') {
      const n = Number(trimmedTotal)
      if (!Number.isInteger(n) || n < 900 || n > 2700) {
        setTargetError('Combined total goal must be a whole number between 900 and 2700 (VR+DM+QR).')
        return
      }
      mockTargetTotal = n
    }
    if (trimmedSjt !== '') {
      const n = Number(trimmedSjt)
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        setTargetError('SJT goal must be a band between 1 and 4.')
        return
      }
      mockTargetSjtBand = n
    }

    setTargetSaving(true)
    try {
      const res = await fetch('/api/plans/mock-target', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, mockTargetTotal, mockTargetSjtBand }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Could not save goals')
      if (data?.plan) {
        setTargetTotalSaved(data.plan.mock_target_total ?? null)
        setTargetSjtSaved(data.plan.mock_target_sjt_band ?? null)
      }
    } catch (e) {
      setTargetError(e instanceof Error ? e.message : 'Could not save goals')
    } finally {
      setTargetSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mock-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          mockDate: form.mockDate,
          scoreVr: form.vr ? Number(form.vr) : null,
          scoreDm: form.dm ? Number(form.dm) : null,
          scoreQr: form.qr ? Number(form.qr) : null,
          scoreSjt: form.sjt ? Number(form.sjt) : null,
          mockType: form.mockType,
          mockSource: form.mockSource || null,
          weaknessTags: form.weaknessTags,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? 'Failed to save mock score')
      }
      if (!data?.score) {
        throw new Error('No score returned from server')
      }

      setScores(prev => [...prev, data.score].sort((a, b) =>
        a.logged_date.localeCompare(b.logged_date)
      ))
      setShowForm(false)
      setActiveTab(form.mockType)
      setForm(f => ({ ...f, vr: '', dm: '', qr: '', sjt: '', mockSource: '', weaknessTags: [] }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save mock score'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const fullScores = scores.filter(s => s.mock_type === 'full')
  const miniScores = scores.filter(s => s.mock_type === 'mini')
  const displayed = activeTab === 'full' ? fullScores : miniScores

  // Chart data per mock type: show date on x-axis
  function buildChartData(list: DBMockScore[]) {
    return list.map((s, i) => {
      const mainScores = [s.score_vr, s.score_dm, s.score_qr].filter(Boolean) as number[]
      const total =
        mainScores.length > 0 ? mainScores.reduce((a, b) => a + b, 0) : undefined
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

  if (propsFingerprint !== appliedFingerprint) {
    setAppliedFingerprint(propsFingerprint)
    setScores(initialScores)
    const t = initialTargetTotal ?? null
    const b = initialTargetSjtBand ?? null
    setTargetTotalSaved(t)
    setTargetSjtSaved(b)
    setTotalInput(t != null ? String(t) : '')
    setSjtInput(b != null ? String(b) : '')
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mock Scores</h1>
          <p className="text-slate-500 mt-1">Track your progress across full and mini mocks</p>
          <p className="text-sm text-slate-500 mt-2 max-w-xl">
            If you only have raw marks, use the{' '}
            <a
              href="https://www.theukcatpeople.co.uk/application-guide/ucat/ucat-score-calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium hover:underline"
            >
              UCAT score calculator
            </a>
            {' '}at The UKCAT People to convert them to scaled scores (300 to 900 per section) before logging.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowForm(v => !v)} variant={showForm ? 'secondary' : 'primary'}>
            {showForm ? 'Cancel' : '+ Log scores'}
          </Button>
        )}
      </div>

      {/* Goals + encouragement */}
      <div className="space-y-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your mock goals</CardTitle>
            {!readOnly && (
              <p className="text-sm text-slate-500 font-normal mt-1">
                Set your combined VR + DM + QR target out of 2700, plus an optional SJT band. Encouragement below
                uses these once mocks are logged.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {readOnly ? (
              <p className="text-sm text-slate-600">
                {targetTotalSaved != null || targetSjtSaved != null ? (
                  <>
                    {targetTotalSaved != null && (
                      <span>
                        Goal total{' '}
                        <span className="font-semibold text-slate-900">
                          {targetTotalSaved}
                        </span>
                        {' '}/ 2700
                      </span>
                    )}
                    {targetTotalSaved != null && targetSjtSaved != null && ' · '}
                    {targetSjtSaved != null && (
                      <span>
                        SJT band{' '}
                        <span className="font-semibold text-slate-900">{targetSjtSaved}</span>
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500">No goals stored for this student yet.</span>
                )}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Target VR + DM + QR total (optional)"
                    type="number"
                    min={900}
                    max={2700}
                    step={10}
                    placeholder="e.g. 2040 · out of 2700"
                    value={totalInput}
                    onChange={e => setTotalInput(e.target.value)}
                  />
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                      Target SJT band (optional)
                    </label>
                    <select
                      value={sjtInput}
                      onChange={e => setSjtInput(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">- Not set -</option>
                      <option value="1">Band 1 (best)</option>
                      <option value="2">Band 2</option>
                      <option value="3">Band 3</option>
                      <option value="4">Band 4</option>
                    </select>
                  </div>
                </div>
                {targetError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {targetError}
                  </p>
                )}
                <Button type="button" variant="secondary" loading={targetSaving} onClick={handleSaveTargets}>
                  Save goals
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {!readOnly && scores.length === 0 && (
          <p className="text-sm text-slate-500 px-1">
            After your first logged mock, a short personalised note appears here comparing progress to these goals.
          </p>
        )}

        {encouragement && (
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50/80 to-white">
            <CardContent className="pt-6 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">Momentum</p>
              <p className="text-sm text-slate-700 leading-relaxed">{encouragement}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Score entry form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Log mock scores</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date + Type + Source */}
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

              {/* Section scores */}
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

              {form.mockType === 'mini' && (
                <p className="text-xs text-slate-400">
                  For a mini mock, only fill in the sections you practiced.
                </p>
              )}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading}>Save scores</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['full', 'mini'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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

      {tabStats && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Summary · {activeTab === 'full' ? 'full' : 'mini'} mocks
            </CardTitle>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              From {tabStats.count} logged {tabStats.count === 1 ? 'mock' : 'mocks'} in this tab.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              {tabStats.avgTotal != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Avg combined (VR+DM+QR)</dt>
                  <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">
                    {tabStats.avgTotal}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ 2700</span>
                  </dd>
                </div>
              )}
              {tabStats.bestTotal != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Best combined</dt>
                  <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">
                    {tabStats.bestTotal}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ 2700</span>
                  </dd>
                </div>
              )}
              {tabStats.avgVr != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Avg VR</dt>
                  <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">{tabStats.avgVr}</dd>
                </div>
              )}
              {tabStats.avgDm != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Avg DM</dt>
                  <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">{tabStats.avgDm}</dd>
                </div>
              )}
              {tabStats.avgQr != null && (
                <div>
                  <dt className="text-xs font-medium text-slate-500">Avg QR</dt>
                  <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">{tabStats.avgQr}</dd>
                </div>
              )}
              {tabStats.bestSjt != null &&
                (tabStats.latestSjt != null && tabStats.latestSjt !== tabStats.bestSjt ? (
                  <>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Best SJT</dt>
                      <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">
                        Band {tabStats.bestSjt}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Latest SJT</dt>
                      <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">
                        Band {tabStats.latestSjt}
                      </dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt className="text-xs font-medium text-slate-500">SJT</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">
                      Band {tabStats.bestSjt}
                    </dd>
                  </div>
                ))}
            </dl>
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
            { key: 'TOTAL', color: '#475569', label: 'VR + DM + QR total', kind: 'total' as const },
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
                          domain={[0, 2700]}
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          tickCount={5}
                          width={44}
                        />
                      )}
                      <Tooltip
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''}
                        formatter={(v) => {
                          if (kind === 'sjt') {
                            return [`Band ${v as number}`, 'SJT']
                          }
                          if (kind === 'total') {
                            return [`${v as number} / 2700`, 'Total']
                          }
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
                  const total = mainScores.length > 0
                    ? mainScores.reduce((a, b) => a + b, 0)
                    : null
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
                        {total !== null && <span className="ml-1 text-xs font-normal text-slate-400">/2700</span>}
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
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">📊</div>
          <p>No {activeTab === 'full' ? 'full' : 'mini'} mock scores logged yet.</p>
          {!readOnly && <p className="text-sm mt-1">After completing a mock, log your scores above.</p>}
        </div>
      )}
    </div>
  )
}
