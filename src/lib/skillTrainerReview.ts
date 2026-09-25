export type ReviewAttempt = {
  itemId: string
  score: number
  max: number
  at: string
  /** Answered from explicit "Review mistakes" mode (?review=1). */
  review?: boolean
}

export type DerivedSkillReviewItem<T extends string> = {
  type: T
  itemId: string
  due: number
  successes: number
}

const REVIEW_DAY_MS = 86_400_000

/** Pure spaced-repetition state machine shared by browser code and verification. */
export function deriveSkillReviewState<T extends string>(
  attemptsByType: Partial<Record<T, ReviewAttempt[]>>,
  types: readonly T[],
  now = Date.now(),
) {
  const pending: DerivedSkillReviewItem<T>[] = []
  let cleared = 0
  for (const type of types) {
    const byItem = new Map<string, ReviewAttempt[]>()
    for (const attempt of attemptsByType[type] ?? []) {
      const rows = byItem.get(attempt.itemId) ?? []
      rows.push(attempt)
      byItem.set(attempt.itemId, rows)
    }
    for (const [itemId, rows] of byItem) {
      let review: DerivedSkillReviewItem<T> | null = null
      for (const attempt of rows.sort((a, b) => a.at.localeCompare(b.at))) {
        const at = new Date(attempt.at).getTime()
        if (attempt.score < attempt.max) {
          review = { type, itemId, due: at + REVIEW_DAY_MS, successes: 0 }
        } else if (review && attempt.review) {
          // A deliberate, correct answer in "Review mistakes" mode clears the item
          // regardless of when it was due. Ordinary drills still need two delayed retries.
          review = null
          cleared++
        } else if (review && at >= review.due) {
          if (review.successes >= 1) {
            review = null
            cleared++
          } else {
            review = { type, itemId, due: at + 3 * REVIEW_DAY_MS, successes: 1 }
          }
        }
      }
      if (review) pending.push(review)
    }
  }
  return {
    pending: pending.sort((a, b) => a.due - b.due),
    due: pending.filter((item) => item.due <= now),
    cleared,
  }
}
