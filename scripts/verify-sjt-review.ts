import assert from "node:assert/strict";
import { loadSJTReviews, loadSJTReviewStats, nextReviewEntry, planSJTReviewSync, removeSJTReview, replaceSJTReviewState, resetSJTReviewState, saveSJTReview, snoozeSJTReview } from "../src/lib/sjtReview";
import type { SJTQuestion } from "../src/types/sjt";
import type { CloudSJTReviewRow, ReviewEntry } from "../src/lib/sjtReview";

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
// Cloud sync merge: a stale local copy never regresses a newer cloud row.
{
  const t0 = 1_900_000_000_000;
  const cloudRow = (entry: ReviewEntry, extra: Partial<CloudSJTReviewRow> = {}): CloudSJTReviewRow => ({
    question_id: entry.id, question_type: entry.type, domain: entry.domain, due_at: new Date(entry.due).toISOString(),
    successes: entry.successes, cleared_at: null, updated_at: new Date(t0 + 10 * day).toISOString(), ...extra,
  });
  const missedAt = nextReviewEntry(undefined, q, 1, 2, t0)!; // miss: due t0 + 1 day
  const successAt = nextReviewEntry(missedAt, q, 2, 2, missedAt.due)!; // first due success on another device
  // This device still holds the pre-success copy: the cloud's success wins, nothing is uploaded.
  let plan = planSJTReviewSync([missedAt], [cloudRow(successAt)]);
  assert.deepEqual(plan.upload, [], "Stale local copy is not uploaded over newer cloud progress");
  assert.deepEqual(plan.active, [successAt], "Merged queue keeps the cloud's further-along copy");
  // Same stale copy but the cloud row was bumped by an old upload: still judged by outcome, not updated_at.
  plan = planSJTReviewSync([missedAt], [cloudRow(successAt, { updated_at: new Date(t0).toISOString() })]);
  assert.deepEqual(plan.upload, []);
  // This device relapsed after the cloud's success (a later outcome): uploaded and kept.
  const relapsed = nextReviewEntry(successAt, q, 0, 2, successAt.due)!;
  plan = planSJTReviewSync([relapsed], [cloudRow(successAt)]);
  assert.deepEqual(plan.upload, [relapsed], "A later local outcome is uploaded");
  assert.deepEqual(plan.active, [relapsed]);
  // A fresh miss in normal practice after the cloud success is also later, even though its due is sooner.
  const freshMiss = nextReviewEntry(successAt, q, 1, 2, missedAt.due + day)!;
  assert.ok(freshMiss.due < successAt.due);
  assert.deepEqual(planSJTReviewSync([freshMiss], [cloudRow(successAt)]).upload, [freshMiss]);
  // Local first success vs cloud still at the miss: local is further along.
  plan = planSJTReviewSync([successAt], [cloudRow(missedAt)]);
  assert.deepEqual(plan.upload, [successAt]);
  // Identical copies: nothing to upload.
  assert.deepEqual(planSJTReviewSync([successAt], [cloudRow(successAt)]).upload, []);
  // Local-only entries are uploaded; cloud-only entries are kept.
  const other: ReviewEntry = { ...missedAt, id: "review-other" };
  plan = planSJTReviewSync([missedAt], [cloudRow(other)]);
  assert.deepEqual(plan.upload, [missedAt]);
  assert.deepEqual(plan.active.map((e) => e.id).sort(), ["review-other", "review-test"]);
  // Cleared or removed in the cloud: dropped locally and never re-uploaded.
  plan = planSJTReviewSync([missedAt], [cloudRow(missedAt, { cleared_at: new Date(t0).toISOString(), due_at: null, successes: 1 })]);
  assert.deepEqual(plan, { upload: [], active: [] });
  // Duplicate cloud rows (fetched by two queries) merge to one entry.
  assert.equal(planSJTReviewSync([], [cloudRow(successAt), cloudRow(successAt)]).active.length, 1);
}
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: () => { throw new Error("Storage blocked"); },
  setItem: () => { throw new Error("Storage full"); },
} });
assert.deepEqual(loadSJTReviews(null), []);
assert.equal(saveSJTReview(null, q, 1, 2), false);
console.log("SJT review checks passed: delayed retries, cleared counts, relapse, account separation, deduplication, privacy, no-regression cloud merge and unavailable storage.");
