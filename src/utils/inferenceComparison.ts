import type { TextSpan } from "../types/inference";

const OVERLAP_THRESHOLD = 0.7;
const PARTIAL_THRESHOLD = 0.5;

/** Compute overlap: proportion of correct span covered by user span. */
function overlapRatio(userSpan: TextSpan, correctSpan: TextSpan): number {
  const overlapStart = Math.max(userSpan.start, correctSpan.start);
  const overlapEnd = Math.min(userSpan.end, correctSpan.end);
  const overlapLen = Math.max(0, overlapEnd - overlapStart);
  const correctLen = correctSpan.end - correctSpan.start;
  if (correctLen <= 0) return 1;
  return overlapLen / correctLen;
}

/** Check if user span fully contains correct span. */
function contains(userSpan: TextSpan, correctSpan: TextSpan): boolean {
  return userSpan.start <= correctSpan.start && userSpan.end >= correctSpan.end;
}

export type ComparisonResult = "correct" | "partial" | "incorrect";

/**
 * Compare user selection against correct spans.
 * Returns "correct" if overlap >= 70% or user contains correct;
 * "partial" if overlap 50–70%;
 * "incorrect" otherwise.
 */
export function compareSelection(
  userSpan: TextSpan | null,
  correctSpans: TextSpan[],
  alternateSpans?: TextSpan[]
): ComparisonResult {
  if (!userSpan || userSpan.start >= userSpan.end) return "incorrect";

  const allCorrect = [...correctSpans, ...(alternateSpans ?? [])];

  for (const correct of allCorrect) {
    const overlap = overlapRatio(userSpan, correct);
    if (overlap >= OVERLAP_THRESHOLD) return "correct";
    if (contains(userSpan, correct)) return "correct";
  }

  for (const correct of allCorrect) {
    const overlap = overlapRatio(userSpan, correct);
    if (overlap >= PARTIAL_THRESHOLD) return "partial";
  }

  return "incorrect";
}

/** Extract text from passage for a span. */
export function getSpanText(passageText: string, span: TextSpan): string {
  return passageText.slice(span.start, span.end);
}
