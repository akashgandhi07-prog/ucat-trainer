import type { DBMockScore } from '@/types'

function trioAvg(s: Pick<DBMockScore, 'score_vr' | 'score_dm' | 'score_qr'>): number | null {
  const parts = [s.score_vr, s.score_dm, s.score_qr].filter((x): x is number => x != null && x > 0)
  if (parts.length === 0) return null
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

/** VR + DM + QR when all three are logged (full trio, max 2700). */
function trioFullSum(s: Pick<DBMockScore, 'score_vr' | 'score_dm' | 'score_qr'>): number | null {
  const { score_vr: vr, score_dm: dm, score_qr: qr } = s
  if (vr == null || dm == null || qr == null || vr <= 0 || dm <= 0 || qr <= 0) return null
  return vr + dm + qr
}

function sortByDate(a: DBMockScore, b: DBMockScore) {
  return a.logged_date.localeCompare(b.logged_date)
}

/**
 * Friendly copy once mocks exist: uses full-trio totals vs /2700 goal, optional SJT band, and simple trends.
 */
export function buildMockEncouragement(
  mocks: DBMockScore[],
  targetTotal: number | null | undefined,
  targetSjtBand: number | null | undefined,
): string | null {
  if (!mocks.length) return null

  const sorted = mocks.slice().sort(sortByDate)
  const withFull = sorted
    .map(s => ({ s, tot: trioFullSum(s) }))
    .filter((x): x is { s: DBMockScore; tot: number } => x.tot != null)

  const withAnyAvg = sorted
    .map(s => ({ s, avg: trioAvg(s) }))
    .filter((x): x is { s: DBMockScore; avg: number } => x.avg != null)

  const parts: string[] = []

  if (withFull.length >= 1) {
    const firstTot = withFull[0].tot
    if (withFull.length === 1) {
      parts.push(
        `Nice work logging your first full VR+DM+QR sitting; that comes to ${firstTot} / 2700, which gives you a clear line in the sand for the next one.`,
      )
    } else {
      const prev = withFull[withFull.length - 2].tot
      const last = withFull[withFull.length - 1].tot
      const delta = last - prev
      if (delta >= 45) {
        parts.push(
          `That last full mock added about ${delta} points on the three numbered sections combined; a real move on the /2700 scale. Keep pressing the section that still wobbles.`,
        )
      } else if (delta <= -45) {
        parts.push(
          `The combined VR+DM+QR total dipped by about ${Math.abs(delta)} versus the previous full sitting. Mocks bounce; use your weakness tags and keep the diary honest.`,
        )
      } else {
        parts.push(
          `You are holding steady on the full-mock total; small plateaus are normal while technique catches up with speed.`,
        )
      }
    }
  } else if (withAnyAvg.length >= 1) {
    const { avg } = withAnyAvg[0]
    parts.push(
      `Nice work logging a mock: sections you entered average about ${avg}. Add all three VR, DM and QR scores together when you can so we can track the /2700 total against your goal.`,
    )
  }

  if (typeof targetTotal === 'number' && Number.isFinite(targetTotal) && withFull.length) {
    const lastTot = withFull[withFull.length - 1].tot
    const gap = targetTotal - lastTot
    if (gap <= 0) {
      parts.push(
        `You are meeting or beating your ${targetTotal} / 2700 goal. Keep proving it under strict exam timing.`,
      )
    } else if (gap <= 90) {
      parts.push(
        `You are within striking distance of your ${targetTotal} / 2700 aim. A focused week on the lowest section often closes a gap this size.`,
      )
    } else {
      parts.push(
        `Your numbered-section goal is ${targetTotal} / 2700; each timed block between now and the exam rehearses chipping away at that space without cramming.`,
      )
    }
  } else if (withFull.length >= 2 && typeof targetTotal !== 'number') {
    parts.push(`Tip: set a total goal above (out of 2700) so the feedback stays anchored to the scorecard you actually sit.`)
  }

  const withSjt = mocks.filter(s => s.score_sjt != null && s.score_sjt > 0)
  const lastSjt = withSjt.sort(sortByDate)[withSjt.length - 1]?.score_sjt
  if (typeof targetSjtBand === 'number' && typeof lastSjt === 'number') {
    if (lastSjt <= targetSjtBand) {
      parts.push(
        `SJT is at or ahead of your band ${targetSjtBand} aim. Translate that judgement into mocks often enough that it stays automatic.`,
      )
    } else {
      parts.push(
        `SJT is still north of where you hope (band ${targetSjtBand}). Lean on rationale drills alongside your numbered sections; it climbs with reps.`,
      )
    }
  }

  const totalMocks = mocks.length
  if (totalMocks >= 3 && parts.length === 0) {
    parts.push(
      `${totalMocks} mocks in the locker already; reviewing each sitting briefly beats only chasing the headline total.`,
    )
  }

  if (!withFull.length && parts.length === 0) {
    parts.push(
      "You've started logging mocks. Add VR, DM and QR scores for a full sitting when you can so we can track your /2700 total against your goal.",
    )
  }

  const message = parts.join(' ')
  return message.trim().length ? message : 'Keep logging mocks: measured practice beats guessing where you stand.'
}
