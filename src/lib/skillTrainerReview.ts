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
const SECOND_STEP_DELAY_MS = 3 * REVIEW_DAY_MS

/**
 * Pure spaced-repetition state machine shared by browser code and verification.
 *
 * A mistake needs two successful steps to clear:
 * - A wrong answer (any mode) schedules the item a day later and resets progress to zero.
 * - Step one: a correct answer once it is due, or a correct answer in "Review mistakes"
 *   mode at any time. The next step is then due three days after that answer.
 * - Step two: a correct answer (any mode) once that three-day delay has passed.
 * Correct answers that are early and not a first review step do not count.
 */
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
        } else if (review && review.successes === 0 && (attempt.review || at >= review.due)) {
          // First step: a delayed correct retry, or a correct answer in "Review mistakes"
          // mode even before it is due. The second step is scheduled the normal interval
          // after this answer, so two answers in one sitting can never clear an item.
          review = { type, itemId, due: at + SECOND_STEP_DELAY_MS, successes: 1 }
        } else if (review && at >= review.due) {
          // Second step: a correct answer (review mode or not) once the delay has passed.
          review = null
          cleared++
        }
        // Any other correct answer (early, and not the first review step) changes nothing.
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
