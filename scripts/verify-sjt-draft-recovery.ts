import assert from "node:assert/strict";
import {
  claimActiveSJTScenario, clearSJTAnswerDraft, DRAFT_TTL_MS, hasSJTAnswerDraft, loadRankingDraft, loadRatingDraft,
  readActiveSJTScenario, resolveSJTResumeWith, saveActiveSJTScenario, saveSJTAnswerDraft, settleActiveSJTScenario, sjtDraftScope,
  type SJTPartialRecorder,
} from "../src/lib/sjtDraftRecovery";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
} });

const now = 1_800_000_000_000;
const alice = sjtDraftScope("user-alice");
const bob = sjtDraftScope("user-bob");
assert.equal(sjtDraftScope(null), "guest");

// Unmarked rating progress restores for the same account only.
saveSJTAnswerDraft(alice, "appropriateness", "q1", { itemIndex: 1, itemPhase: "rating", selected: "appropriate", scores: [1] }, now);
assert.deepEqual(loadRatingDraft(alice, "appropriateness", "q1", 3, now + 1000), { itemIndex: 1, itemPhase: "rating", selected: "appropriate", scores: [1] });
assert.equal(loadRatingDraft(bob, "appropriateness", "q1", 3, now + 1000), null, "Drafts are separate per account");
assert.equal(loadRatingDraft("guest", "appropriateness", "q1", 3, now + 1000), null, "Guest cannot see an account draft");
assert.equal(loadRatingDraft(alice, "appropriateness", "q1", 1, now + 1000), null, "Out-of-range restored items are rejected");

// Null scope (delayed-review mode) neither saves nor restores.
saveSJTAnswerDraft(null, "appropriateness", "q-review", { itemIndex: 0, itemPhase: "rating", selected: "appropriate", scores: [] }, now);
assert.equal([...memory.keys()].some((k) => k.includes("q-review")), false, "Review mode never writes drafts");
assert.equal(loadRatingDraft(null, "appropriateness", "q1", 3, now), null, "Review mode never restores drafts");

// Drafts expire.
assert.equal(loadRatingDraft(alice, "appropriateness", "q1", 3, now + DRAFT_TTL_MS + 1), null, "Drafts older than the TTL are discarded");
assert.equal(loadRatingDraft(alice, "appropriateness", "q1", 3, now + 1000), null, "Expired drafts are deleted, not just hidden");

// A marked (feedback) state is never restored, even if written by an older build.
memory.set(`ucat_sjt_draft_v2:${alice}:importance:q3`, JSON.stringify({ itemIndex: 0, itemPhase: "feedback", selected: "important", scores: [1], savedAt: now }));
assert.equal(loadRatingDraft(alice, "importance", "q3", 3, now), null, "Feedback state would reveal the key");
memory.set(`ucat_sjt_draft_v2:${alice}:importance:q4`, JSON.stringify({ itemIndex: 2, itemPhase: "rating", selected: null, scores: [1], savedAt: now }));
assert.equal(loadRatingDraft(alice, "importance", "q4", 3, now), null, "Scores must match the items already answered");

// Ranking: only the unsubmitted answer restores.
saveSJTAnswerDraft(alice, "ranking", "q2", { phase: "answering", answer: { most: "a", least: "c" } }, now);
assert.deepEqual(loadRankingDraft(alice, "ranking", "q2", now), { phase: "answering", answer: { most: "a", least: "c" } });
clearSJTAnswerDraft(alice, "ranking", "q2");
assert.equal(loadRankingDraft(alice, "ranking", "q2", now), null, "Submitting clears the draft");
memory.set(`ucat_sjt_draft_v2:${alice}:ranking:q5`, JSON.stringify({ phase: "results", answer: { most: "a", least: "c" }, savedAt: now }));
assert.equal(loadRankingDraft(alice, "ranking", "q5", now), null, "Submitted rankings are never restored");

// Legacy unscoped drafts are dropped, and corrupt state is rejected.
memory.set("ucat_sjt_draft_v1:ranking:q6", JSON.stringify({ phase: "results", answer: { most: "a", least: "c" } }));
assert.equal(loadRankingDraft(alice, "ranking", "q6", now), null);
assert.equal(memory.has("ucat_sjt_draft_v1:ranking:q6"), false, "Legacy v1 drafts are removed");
memory.set(`ucat_sjt_draft_v2:${alice}:ranking:bad`, "not-json");
assert.equal(loadRankingDraft(alice, "ranking", "bad", now), null);
memory.set(`ucat_sjt_draft_v2:${alice}:ranking:nots`, JSON.stringify({ phase: "answering", answer: { most: "a", least: null } }));
assert.equal(loadRankingDraft(alice, "ranking", "nots", now), null, "Drafts without a timestamp are rejected");

// ---------- Active scenario pointer (reopen the same scenario after a reload) ----------
memory.clear();
const noFilters = { domain: "", difficulty: "" };
const recorded: Array<{ userId: string | null; questionId: string; itemsAttempted: number; partialScore: number }> = [];
const record: SJTPartialRecorder = (userId, scenario, progress) => {
  recorded.push({ userId, questionId: scenario.questionId, itemsAttempted: progress.itemsAttempted, partialScore: progress.partialScore });
};
const pointer = (questionId: string, itemsAttempted: number, partialScore: number, filters = noFilters) => ({
  type: "appropriateness", questionId, domain: "trust_professionalism", filters,
  progress: itemsAttempted > 0 ? { itemsAttempted, itemsTotal: 4, partialScore } : null,
});
/** Mid-scenario state: item 1 marked, item 2 selected but not confirmed. */
function midScenario(scope: string, questionId: string, at = now) {
  assert.equal(saveActiveSJTScenario(scope, pointer(questionId, 1, 1), at), true);
  saveSJTAnswerDraft(scope, "appropriateness", questionId, { itemIndex: 1, itemPhase: "rating", selected: "inappropriate", scores: [1] }, at);
}

// Save, load and scope.
midScenario(alice, "p1");
assert.deepEqual(readActiveSJTScenario(alice, "appropriateness"), { ...pointer("p1", 1, 1), savedAt: now });
assert.equal(readActiveSJTScenario(bob, "appropriateness"), null, "Pointers are separate per account");
assert.equal(readActiveSJTScenario("guest", "appropriateness"), null, "Guest cannot see an account pointer");
assert.equal(readActiveSJTScenario(alice, "ranking"), null, "Pointers are separate per trainer type");
assert.equal(hasSJTAnswerDraft(alice, "appropriateness", "p1", now), true);

// Reload (pagehide records nothing): the same scenario resumes at the unmarked item, with nothing recorded yet.
const resumed = resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 5 * 60_000);
assert.equal(resumed?.questionId, "p1", "A fresh pointer reopens the same scenario");
assert.equal(recorded.length, 0, "Resuming records nothing");
assert.deepEqual(loadRatingDraft(alice, "appropriateness", "p1", 4, now + 5 * 60_000),
  { itemIndex: 1, itemPhase: "rating", selected: "inappropriate", scores: [1] }, "Resumes at item 2 with its unconfirmed choice, no feedback");
assert.equal(resolveSJTResumeWith(bob, "appropriateness", noFilters, record, now), null, "Another account never resumes it");

// Resumed then completed: submit claims the pointer first, so no partial is ever recorded afterwards.
assert.equal(claimActiveSJTScenario(alice, "appropriateness", "p1")?.questionId, "p1");
assert.equal(readActiveSJTScenario(alice, "appropriateness"), null);
assert.equal(hasSJTAnswerDraft(alice, "appropriateness", "p1", now), false, "Claiming also clears the draft");
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "p1", record), null);
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now), null);
assert.equal(recorded.length, 0, "A resumed-then-completed scenario records no partial");

// Resumed then abandoned in-app: the partial is recorded exactly once.
midScenario(alice, "p2");
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "p2", record)?.questionId, "p2");
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "p2", record), null);
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now), null);
assert.deepEqual(recorded, [{ userId: "user-alice", questionId: "p2", itemsAttempted: 1, partialScore: 1 }], "Abandoned partial recorded once");
recorded.length = 0;

// Claiming only takes the matching scenario.
midScenario(alice, "p3");
assert.equal(claimActiveSJTScenario(alice, "appropriateness", "other"), null);
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.questionId, "p3", "A different scenario's pointer is left alone");

// Expiry on the next visit: not resumed, partial recorded once, draft removed.
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + DRAFT_TTL_MS + 1), null, "Expired pointers do not resume");
assert.deepEqual(recorded.map((r) => r.questionId), ["p3"]);
assert.equal(readActiveSJTScenario(alice, "appropriateness"), null, "Expired pointer removed");
assert.equal(memory.has(`ucat_sjt_draft_v2:${alice}:appropriateness:p3`), false, "Expired pointer's draft removed");
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + DRAFT_TTL_MS + 2), null);
assert.equal(recorded.length, 1, "Expiry records once");
recorded.length = 0;

// Opening with different practice filters discards the old scenario (recorded once).
midScenario(alice, "p4");
assert.equal(resolveSJTResumeWith(alice, "appropriateness", { domain: "trust_professionalism", difficulty: "" }, record, now), null);
assert.deepEqual(recorded.map((r) => r.questionId), ["p4"]);
recorded.length = 0;

// Pointer without its draft (for example cleared by marking the last item) is not resumed.
saveActiveSJTScenario(alice, pointer("p5", 0, 0), now);
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now), null);
assert.equal(recorded.length, 0, "Nothing marked, nothing recorded");
assert.equal(readActiveSJTScenario(alice, "appropriateness"), null);

// A fully answered scenario was recorded as complete at submit: never resumed nor recorded as partial.
saveActiveSJTScenario(alice, { ...pointer("p6", 0, 0), progress: { itemsAttempted: 4, itemsTotal: 4, partialScore: 3 } }, now);
saveSJTAnswerDraft(alice, "appropriateness", "p6", { itemIndex: 0, itemPhase: "rating", selected: null, scores: [] }, now);
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now), null);
assert.equal(recorded.length, 0);

// Guests record without a user id; a marked (feedback) draft behind a valid pointer still never restores the key.
midScenario("guest", "g1");
assert.equal(resolveSJTResumeWith("guest", "appropriateness", noFilters, record, now)?.questionId, "g1");
memory.set(`ucat_sjt_draft_v2:guest:appropriateness:g1`, JSON.stringify({ itemIndex: 1, itemPhase: "feedback", selected: "inappropriate", scores: [1], savedAt: now }));
assert.equal(loadRatingDraft("guest", "appropriateness", "g1", 4, now), null, "Marked state is never restored");
settleActiveSJTScenario("guest", "appropriateness", undefined, record);
assert.deepEqual(recorded, [{ userId: null, questionId: "g1", itemsAttempted: 1, partialScore: 1 }]);
recorded.length = 0;

// Ranking: an unsubmitted ranking resumes with its choices; nothing is marked, so discarding records nothing.
assert.equal(saveActiveSJTScenario(alice, { type: "ranking", questionId: "r1", domain: "trust_professionalism", filters: noFilters, progress: null }, now), true);
saveSJTAnswerDraft(alice, "ranking", "r1", { phase: "answering", answer: { most: "a", least: null } }, now);
assert.equal(resolveSJTResumeWith(alice, "ranking", noFilters, record, now)?.questionId, "r1");
assert.deepEqual(loadRankingDraft(alice, "ranking", "r1", now), { phase: "answering", answer: { most: "a", least: null } });
settleActiveSJTScenario(alice, "ranking", "r1", record);
assert.equal(recorded.length, 0);

// Review mode (null scope) never writes, reads or resumes a pointer.
assert.equal(saveActiveSJTScenario(null, pointer("rv", 1, 1), now), false);
assert.equal([...memory.keys()].some((k) => k.includes("ucat_sjt_active_v1") && k.includes("rv")), false, "Review mode never writes pointers");
midScenario(alice, "p7");
assert.equal(resolveSJTResumeWith(null, "appropriateness", noFilters, record, now), null, "Review mode never resumes");
assert.equal(readActiveSJTScenario(null, "appropriateness"), null);
assert.equal(settleActiveSJTScenario(null, "appropriateness", undefined, record), null);
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.questionId, "p7", "Review mode leaves the practice pointer alone");
assert.equal(recorded.length, 0);

// Corrupt pointers are removed.
memory.set(`ucat_sjt_active_v1:${alice}:importance`, "not-json");
assert.equal(readActiveSJTScenario(alice, "importance"), null);
assert.equal(memory.has(`ucat_sjt_active_v1:${alice}:importance`), false);
memory.set(`ucat_sjt_active_v1:${alice}:importance`, JSON.stringify({ ...pointer("x", 1, 9), type: "importance", savedAt: now }));
assert.equal(readActiveSJTScenario(alice, "importance"), null, "Impossible progress is rejected");

console.log("SJT draft recovery checks passed: per-account scope, review-mode opt-out, expiry, unsubmitted-only restore, cleanup, corrupt-state rejection, active-scenario resume (scope, expiry, filters, review opt-out) and record-once partials.");
