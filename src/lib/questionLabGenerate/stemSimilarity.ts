import { normaliseStemKey } from "./utils.ts";

/** 0–1 word overlap similarity for near-duplicate detection. */
export function stemSimilarity(a: string, b: string): number {
  const wa = new Set(
    normaliseStemKey(a)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  const wb = new Set(
    normaliseStemKey(b)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter += 1;
  }
  return inter / Math.max(wa.size, wb.size);
}

const NEAR_DUPLICATE_THRESHOLD = 0.82;

export function findNearDuplicateStem(
  stem: string,
  bankStems: string[],
): { match: string; score: number } | null {
  let best: { match: string; score: number } | null = null;
  for (const other of bankStems) {
    if (!other.trim()) continue;
    const score = stemSimilarity(stem, other);
    if (score >= NEAR_DUPLICATE_THRESHOLD && (!best || score > best.score)) {
      best = { match: other, score };
    }
  }
  return best;
}
