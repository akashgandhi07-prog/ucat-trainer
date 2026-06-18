/**
 * Learner-selected mock weaknesses drive section weight boosts and rationales.
 * IDs stored on mock_scores.weakness_tags.
 */

export type WeaknessSection = 'vr' | 'dm' | 'qr' | 'sjt'

export interface MockWeaknessOption {
  id: string
  section: WeaknessSection
  label: string
  /** Fragment for rationales ("your QR pacing focus") */
  hint: string
}

export const MOCK_WEAKNESS_OPTIONS: MockWeaknessOption[] = [
  { id: 'vr_inference', section: 'vr', label: 'VR: inference', hint: 'VR inference' },
  { id: 'vr_speed', section: 'vr', label: 'VR: reading speed', hint: 'VR reading speed' },
  { id: 'dm_logic', section: 'dm', label: 'DM: logic puzzles', hint: 'DM logic' },
  { id: 'dm_math', section: 'dm', label: 'DM: quantitative bits', hint: 'DM maths-style items' },
  { id: 'dm_graphs', section: 'dm', label: 'DM: charts/graphs', hint: 'DM charts' },
  { id: 'qr_setup', section: 'qr', label: 'QR: setting up', hint: 'QR question setup' },
  { id: 'qr_speed', section: 'qr', label: 'QR: pacing', hint: 'QR pacing' },
  { id: 'qr_accuracy', section: 'qr', label: 'QR: careless slips', hint: 'QR accuracy' },
  { id: 'sjt_band', section: 'sjt', label: 'SJT: situational judgement', hint: 'SJT band / reasoning' },
]

const OPT_BY_ID = new Map(MOCK_WEAKNESS_OPTIONS.map(o => [o.id, o]))

/** Raw weight deltas before normalization (paired with confidence-based weights). */
export function weaknessTagWeightBonus(tags: string[] | null | undefined): {
  vr: number
  dm: number
  qr: number
  sjt: number
} {
  const bon = { vr: 0, dm: 0, qr: 0, sjt: 0 }
  if (!tags?.length) return bon
  for (const t of tags) {
    const o = OPT_BY_ID.get(t)
    if (!o) continue
    bon[o.section] += 0.42
  }
  return bon
}

export function filterValidWeaknessTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const valid = new Set(MOCK_WEAKNESS_OPTIONS.map(o => o.id))
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && valid.has(x)))]
}

export function weaknessHints(tags: string[] | null | undefined): string[] {
  if (!tags?.length) return []
  return tags.map(t => OPT_BY_ID.get(t)?.hint).filter(Boolean) as string[]
}

/**
 * The specific topic to drill per section, taken from logged mock weaknesses. Lets a
 * generic "Decision making" block show what to actually work on ("DM: charts/graphs").
 * First tagged weakness per section wins.
 */
export function topicFocusBySection(
  tags: string[] | null | undefined,
): Partial<Record<WeaknessSection, string>> {
  const out: Partial<Record<WeaknessSection, string>> = {}
  if (!tags?.length) return out
  for (const t of tags) {
    const o = OPT_BY_ID.get(t)
    if (o && !out[o.section]) out[o.section] = o.label
  }
  return out
}

/** Which numbered section lagged cohort average most (VR/DM/QR only; SJT scoring differs). */
export function weakestSectionFromScores(mock: {
  vr: number | null
  dm: number | null
  qr: number | null
} | null): WeaknessSection | null {
  if (!mock || (!mock.vr && !mock.dm && !mock.qr)) return null
  const scores = [mock.vr, mock.dm, mock.qr].filter((s): s is number => typeof s === 'number' && s > 0)
  if (!scores.length) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const deltas = {
    vr: mock.vr ? avg - mock.vr : -999,
    dm: mock.dm ? avg - mock.dm : -999,
    qr: mock.qr ? avg - mock.qr : -999,
  }
  const m = Math.max(deltas.vr, deltas.dm, deltas.qr)
  if (m <= 0) return null
  if (m === deltas.vr) return 'vr'
  if (m === deltas.dm) return 'dm'
  return 'qr'
}
