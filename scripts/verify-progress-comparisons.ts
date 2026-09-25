import assert from "node:assert/strict";
import { deriveSkillReviewState } from "../src/lib/skillTrainerReview";
import { accuracyByDifficulty, compareAccuracyWindows, compareLikeForLike, compareSpeedWithAccuracy } from "../src/lib/progressComparisons";

const scored = Array.from({ length: 10 }, (_, index) => ({ correct: index < 5 ? 6 : 8, total: 10 }));
assert.equal(compareAccuracyWindows(scored.slice(1)), null, "Never compare five sessions with a shorter earlier window");
assert.deepEqual(compareAccuracyWindows(scored), {
  recent: 80, previous: 60, delta: 20,
  recentCorrect: 40, recentTotal: 50, previousCorrect: 30, previousTotal: 50,
});

const weighted = compareAccuracyWindows([
  ...Array.from({ length: 5 }, () => ({ correct: 1, total: 2 })),
  { correct: 9, total: 10 },
  ...Array.from({ length: 4 }, () => ({ correct: 1, total: 1 })),
]);
assert.equal(weighted?.recent, 93, "Question totals, rather than session averages, determine accuracy");

assert.deepEqual(accuracyByDifficulty([
  { difficulty: "easy", correct: 1, total: 2 },
  { difficulty: "easy", correct: 8, total: 8 },
  { difficulty: "hard", correct: 2, total: 4 },
  { difficulty: "stage_1", correct: 10, total: 10 },
]).map(({ difficulty, accuracy, correct, total }) => ({ difficulty, accuracy, correct, total })), [
  { difficulty: "easy", accuracy: 90, correct: 9, total: 10 },
  { difficulty: "hard", accuracy: 50, correct: 2, total: 4 },
]);

const stableSpeed = compareSpeedWithAccuracy([
  ...Array.from({ length: 5 }, () => ({ wpm: 250, correct: 8, total: 10 })),
  ...Array.from({ length: 5 }, () => ({ wpm: 275, correct: 8, total: 10 })),
]);
assert.equal(stableSpeed?.accuracyStable, true);
assert.equal(stableSpeed?.wpmDelta, 25);
const unsafeSpeed = compareSpeedWithAccuracy([
  ...Array.from({ length: 5 }, () => ({ wpm: 250, correct: 9, total: 10 })),
  ...Array.from({ length: 5 }, () => ({ wpm: 300, correct: 7, total: 10 })),
]);
assert.equal(unsafeSpeed?.accuracyStable, false, "Faster reading with a material accuracy drop is not an improvement");

const mixed = [
  ...Array.from({ length: 10 }, (_, index) => ({ training_type: "rapid_recall", difficulty: "hard", created_at: new Date(index).toISOString(), correct: index < 5 ? 5 : 7, total: 10 })),
  ...Array.from({ length: 9 }, (_, index) => ({ training_type: "rapid_recall", difficulty: "easy", created_at: new Date(100 + index).toISOString(), correct: 10, total: 10 })),
];
const likeForLike = compareLikeForLike(mixed);
assert.equal(likeForLike?.difficulty, "hard", "An easier but incomplete window must not distort measured progress");
assert.equal(likeForLike?.delta, 20);

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 8, 1);
const iso = (ms: number) => new Date(ms).toISOString();
const wrong = { itemId: "q1", score: 0, max: 1, at: iso(t0) };
const early = deriveSkillReviewState({ qr_setup: [wrong, { itemId: "q1", score: 1, max: 1, at: iso(t0 + 60_000) }] }, ["qr_setup"] as const, t0 + 120_000);
assert.equal(early.pending.length, 1, "An early correct answer in an ordinary drill does not count as a delayed retry");
assert.equal(early.due.length, 0);
const reviewed = deriveSkillReviewState({ qr_setup: [wrong, { itemId: "q1", score: 1, max: 1, at: iso(t0 + 60_000), review: true }] }, ["qr_setup"] as const, t0 + 120_000);
assert.equal(reviewed.pending.length, 0, "A correct answer in Review mistakes mode clears the item");
assert.equal(reviewed.cleared, 1);
const delayed = deriveSkillReviewState({ qr_setup: [wrong, { itemId: "q1", score: 1, max: 1, at: iso(t0 + DAY) }, { itemId: "q1", score: 1, max: 1, at: iso(t0 + 4 * DAY) }] }, ["qr_setup"] as const, t0 + 5 * DAY);
assert.equal(delayed.cleared, 1, "Two successful delayed retries clear an item");

console.log("Progress comparison checks passed: equal windows, weighted accuracy, difficulty and accuracy-gated speed.");
