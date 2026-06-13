import { RAW_PASSAGES } from "../data/passages";

export type VrCategoryStat = {
  category: string;
  attempts: number;
  correct: number;
  total: number;
  accuracyPct: number;
};

export type VrCategoryInsight = {
  weakest: VrCategoryStat;
  strongest: VrCategoryStat;
  gapPts: number;
  message: string;
};

export type VrInsightRow = {
  passage_id: string | null;
  correct: number;
  total: number;
};

/** Minimum attempted passages per category before the nudge can fire. */
const MIN_ATTEMPTS_PER_CATEGORY = 3;
/** Minimum gap (percentage points) between best and worst category accuracy. */
const MIN_GAP_PTS = 15;

const PASSAGE_CATEGORY_BY_ID: ReadonlyMap<string, string> = new Map(
  RAW_PASSAGES.map((p) => [p.id, p.category]),
);

/**
 * Aggregate VR session rows into per-category accuracy stats.
 * Rows with a null/unknown passage_id or total of 0 are ignored.
 * Pure function: no fetching, safe to unit test.
 */
export function buildVrCategoryStats(rows: VrInsightRow[]): VrCategoryStat[] {
  const byCategory = new Map<string, { attempts: number; correct: number; total: number }>();
  for (const row of rows) {
    if (!row.passage_id || row.total <= 0) continue;
    const category = PASSAGE_CATEGORY_BY_ID.get(row.passage_id);
    if (!category) continue;
    const agg = byCategory.get(category) ?? { attempts: 0, correct: 0, total: 0 };
    agg.attempts += 1;
    agg.correct += row.correct;
    agg.total += row.total;
    byCategory.set(category, agg);
  }
  return [...byCategory.entries()]
    .map(([category, agg]) => ({
      category,
      attempts: agg.attempts,
      correct: agg.correct,
      total: agg.total,
      accuracyPct: Math.round((agg.correct / agg.total) * 100),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Derive a focus nudge from per-category stats.
 * Returns null unless at least two categories each have three or more
 * attempted passages and the best-to-worst accuracy gap is 15+ points.
 */
export function deriveVrInsight(stats: VrCategoryStat[]): VrCategoryInsight | null {
  const eligible = stats.filter((s) => s.attempts >= MIN_ATTEMPTS_PER_CATEGORY);
  if (eligible.length < 2) return null;
  let weakest = eligible[0];
  let strongest = eligible[0];
  for (const stat of eligible) {
    if (stat.accuracyPct < weakest.accuracyPct) weakest = stat;
    if (stat.accuracyPct > strongest.accuracyPct) strongest = stat;
  }
  const gapPts = strongest.accuracyPct - weakest.accuracyPct;
  if (gapPts < MIN_GAP_PTS) return null;
  const message =
    `Your ${weakest.category} passage accuracy (${weakest.accuracyPct}%) is ${gapPts} points ` +
    `below your ${strongest.category} accuracy (${strongest.accuracyPct}%). ` +
    `Worth scheduling extra ${weakest.category}-heavy verbal practice.`;
  return { weakest, strongest, gapPts, message };
}
