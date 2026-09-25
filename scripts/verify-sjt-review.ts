import assert from "node:assert/strict";
import { loadSJTReviews, loadSJTReviewStats, nextReviewEntry, removeSJTReview, replaceSJTReviewState, resetSJTReviewState, saveSJTReview, snoozeSJTReview } from "../src/lib/sjtReview";
import type { SJTQuestion } from "../src/types/sjt";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
} });
Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
const q: SJTQuestion = { id: "review-test", type: "ranking", domain: "trust_professionalism", difficulty: "standard", stem: "Private question text", items: [] };
const day = 86_400_000;
const now = 1_000_000;
const missed = nextReviewEntry(undefined, q, 1, 2, now)!;
assert.equal(missed.due, now + day);
assert.deepEqual(nextReviewEntry(missed, q, 2, 2, now + 1), missed, "Immediate success must not clear a delayed retry");
const first = nextReviewEntry(missed, q, 2, 2, missed.due)!;
assert.equal(first.successes, 1);
assert.equal(first.due, missed.due + 3 * day);
assert.deepEqual(nextReviewEntry(first, q, 2, 2, first.due - 1), first);
assert.equal(nextReviewEntry(first, q, 2, 2, first.due), null, "Two due successes clear the scenario");
const relapse = nextReviewEntry(first, q, 0, 2, first.due)!;
assert.equal(relapse.successes, 0);
assert.equal(relapse.due, first.due + day);
assert.equal(nextReviewEntry(undefined, q, 2, 2, now), null);
assert.equal(nextReviewEntry(undefined, q, NaN, 2, now), null);
assert.equal(saveSJTReview("student-a", q, 1, 2), true);
assert.equal(loadSJTReviews("student-a").length, 1);
assert.equal(loadSJTReviews("student-b").length, 0);
assert.equal(loadSJTReviews(null).length, 0);
assert.ok(!JSON.stringify([...memory.values()]).includes(q.stem), "Do not store question content or answer keys");
saveSJTReview("student-a", q, 0, 2);
assert.equal(loadSJTReviews("student-a").length, 1, "Retry updates rather than duplicates");
assert.equal(removeSJTReview("student-a", q.id, q.type), true);
assert.equal(loadSJTReviews("student-a").length, 0);
memory.set("ucat_sjt_review_v1:student-a", JSON.stringify([{ ...missed, due: Date.now() - 1, successes: 1 }]));
assert.equal(saveSJTReview("student-a", q, 2, 2), true);
assert.equal(loadSJTReviewStats("student-a").cleared, 1, "A second successful delayed retry increments cleared mistakes");
assert.equal(saveSJTReview("student-a", q, 2, 2), true);
assert.equal(loadSJTReviewStats("student-a").cleared, 1, "An already-cleared scenario cannot be counted twice");
assert.equal(replaceSJTReviewState("student-controls", [missed], 4), true);
assert.equal(snoozeSJTReview("student-controls", q.id, q.type, now), true);
assert.equal(loadSJTReviews("student-controls")[0].due, now + day);
assert.equal(resetSJTReviewState("student-controls"), true);
assert.deepEqual(loadSJTReviews("student-controls"), []);
assert.equal(loadSJTReviewStats("student-controls").cleared, 0);
memory.set("ucat_sjt_review_v1:guest", "broken-json");
assert.deepEqual(loadSJTReviews(null), []);
memory.set("ucat_sjt_review_v1:guest", JSON.stringify([{...missed, domain: "__proto__"}]));
assert.deepEqual(loadSJTReviews(null), []);
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: () => { throw new Error("Storage blocked"); },
  setItem: () => { throw new Error("Storage full"); },
} });
assert.deepEqual(loadSJTReviews(null), []);
assert.equal(saveSJTReview(null, q, 1, 2), false);
console.log("SJT review checks passed: delayed retries, cleared counts, relapse, account separation, deduplication, privacy and unavailable storage.");
