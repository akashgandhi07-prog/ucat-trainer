import assert from "node:assert/strict";
import {
  activeSJTScenarioOwnership, claimActiveSJTScenario, claimSJTAttemptCompletion, clearSJTAnswerDraft, DRAFT_TTL_MS, hasSJTAnswerDraft, heartbeatSJTScenario,
  isActiveSJTScenarioLive, listActiveSJTScenarioTypes, loadRankingDraft, loadRatingDraft, migrateGuestSJTScenariosWith,
  readActiveSJTScenario, releaseSJTScenario, resolveSJTResumeWith, saveActiveSJTScenario, saveSJTAnswerDraft, settleActiveSJTScenario,
  settleStaleSJTScenariosWith, SJT_ACTIVE_LIVE_MS, SJT_ATTEMPT_MARKER_TTL_MS, sjtDraftScope, writeOwnedSJTScenario,
  markSJTAttemptSaved, readSJTAttemptSaved,
  type SJTPartialRecorder,
} from "../src/lib/sjtDraftRecovery";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
  get length() { return memory.size; },
  key: (index: number) => [...memory.keys()][index] ?? null,
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
  return `local-${scenario.questionId}`;
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
const p1 = readActiveSJTScenario(alice, "appropriateness");
assert.deepEqual(p1 && { ...p1, attemptId: "x" }, { ...pointer("p1", 1, 1), savedAt: now, attemptId: "x", owner: "", aliveAt: 0 });
assert.ok(p1 && p1.attemptId.length > 0, "Each pointer carries an attempt id");
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

// Legacy pointers (written before tab ownership) still read, as unowned and not live.
memory.clear();
memory.set(`ucat_sjt_active_v1:${alice}:appropriateness`, JSON.stringify({ ...pointer("lg", 1, 1), savedAt: now }));
const legacy = readActiveSJTScenario(alice, "appropriateness");
assert.equal(legacy?.owner, "");
assert.equal(legacy && isActiveSJTScenarioLive(legacy, now), false);
assert.equal(claimActiveSJTScenario(alice, "appropriateness", "lg", legacy?.attemptId)?.questionId, "lg");

// ---------- Two tabs on the same trainer: exactly one row per attempt ----------
memory.clear();
recorded.length = 0;
const TAB_A = "tab-a";
const TAB_B = "tab-b";
const attemptBase = { type: "appropriateness", domain: "trust_professionalism", filters: noFilters };
type Progress = { itemsAttempted: number; itemsTotal: number; partialScore: number } | null;
const writeAs = (tabId: string, questionId: string, attemptId: string, progress: Progress, previouslyOwned: boolean, at = now) =>
  writeOwnedSJTScenario(alice, { ...attemptBase, questionId, attemptId, progress }, { tabId, previouslyOwned, record, now: at });
const draftAt = (questionId: string) =>
  saveSJTAnswerDraft(alice, "appropriateness", questionId, { itemIndex: 1, itemPhase: "rating", selected: null, scores: [1] }, now);

// Tab A starts t1 and owns it.
assert.equal(writeAs(TAB_A, "t1", "att-1", null, false), "owned");
draftAt("t1");
assert.equal(writeAs(TAB_A, "t1", "att-1", { itemsAttempted: 1, itemsTotal: 4, partialScore: 1 }, true), "owned");
assert.equal(isActiveSJTScenarioLive(readActiveSJTScenario(alice, "appropriateness")!, now + 1000), true, "The owner's pointer is live");

// Tab B opens the trainer: the scenario is resumable, so B resumes it and takes ownership.
const resumedB = resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B);
assert.equal(resumedB?.attemptId, "att-1", "Tab B resumes the same attempt");
assert.equal(resumedB?.owner, TAB_B);
assert.equal(activeSJTScenarioOwnership(alice, "appropriateness", "att-1", TAB_A), "other", "Tab A has lost ownership");
assert.equal(activeSJTScenarioOwnership(alice, "appropriateness", "att-1", TAB_B), "owner");
assert.equal(heartbeatSJTScenario(alice, "appropriateness", "att-1", TAB_A, now + 2000), "other", "A's heartbeat reports the loss");
assert.equal(writeAs(TAB_A, "t1", "att-1", { itemsAttempted: 2, itemsTotal: 4, partialScore: 2 }, true), "lost", "A cannot overwrite B's pointer");
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.owner, TAB_B);
// A's pagehide only releases a pointer it owns: nothing changes and nothing is recorded.
releaseSJTScenario(alice, "appropriateness", "att-1", TAB_A);
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.aliveAt, now + 1000, "A non-owner cannot release the pointer");
assert.equal(recorded.length, 0);

// B finishes the scenario: it claims and records once; A's later submit finds nothing to claim.
assert.equal(claimActiveSJTScenario(alice, "appropriateness", "t1", "att-1")?.owner, TAB_B, "B's submit claims the attempt");
assert.equal(claimActiveSJTScenario(alice, "appropriateness", "t1", "att-1"), null, "A's submit claims nothing, so records nothing");
assert.equal(activeSJTScenarioOwnership(alice, "appropriateness", "att-1", TAB_A), "gone");
assert.equal(settleStaleSJTScenariosWith(alice, record, now + DRAFT_TTL_MS * 2), 0, "Nothing left to settle later");
assert.equal(recorded.length, 0, "No partial for a completed attempt");

// Non-owner submits first: it may claim (the owner has not recorded yet); the owner then finds it gone.
assert.equal(writeAs(TAB_A, "t2", "att-2", { itemsAttempted: 1, itemsTotal: 4, partialScore: 1 }, false), "owned");
draftAt("t2");
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B)?.owner, TAB_B);
assert.ok(claimActiveSJTScenario(alice, "appropriateness", "t2", "att-2"), "Tab A (non-owner) submits and claims");
assert.equal(activeSJTScenarioOwnership(alice, "appropriateness", "att-2", TAB_B), "gone", "Tab B sees it gone: no pagehide or leave record");
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "t2", record, "att-2"), null, "B leaving records nothing");
assert.equal(recorded.length, 0);

// Owner leaves in-app: claims and records the partial once; the other tab's later leave records nothing.
assert.equal(writeAs(TAB_A, "t3", "att-3", { itemsAttempted: 2, itemsTotal: 4, partialScore: 1.5 }, false), "owned");
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "t3", record, "att-3")?.questionId, "t3");
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "t3", record, "att-3"), null);
assert.deepEqual(recorded.map((r) => r.questionId), ["t3"], "Partial recorded exactly once across tabs");
recorded.length = 0;

// A live tab on a different scenario blocks a second tab's pointer (it records directly) and is never settled by it.
assert.equal(writeAs(TAB_A, "t4", "att-4", { itemsAttempted: 1, itemsTotal: 4, partialScore: 1 }, false), "owned");
assert.equal(resolveSJTResumeWith(alice, "appropriateness", { domain: "trust_professionalism", difficulty: "" }, record, now + 1000, TAB_B), null);
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.attemptId, "att-4", "Other filters in tab B do not settle A's live scenario");
assert.equal(writeAs(TAB_B, "t5", "att-5", null, false, now + 1000), "blocked", "Tab B runs without a pointer");
assert.equal(recorded.length, 0);
// Once A's pointer is released (tab closed), B's next write settles it once and takes the slot.
releaseSJTScenario(alice, "appropriateness", "att-4", TAB_A);
assert.equal(writeAs(TAB_B, "t5", "att-5", { itemsAttempted: 1, itemsTotal: 4, partialScore: 0 }, false, now + 2000), "owned");
assert.deepEqual(recorded.map((r) => r.questionId), ["t4"]);
assert.equal(writeAs(TAB_A, "t4", "att-4", { itemsAttempted: 2, itemsTotal: 4, partialScore: 1 }, true, now + 3000), "lost", "A (restored) sees its attempt was recorded");
assert.equal(recorded.length, 1);
recorded.length = 0;
memory.clear();

// Reload: pagehide releases, the reloaded page (a new tab id) resumes and owns it; a crashed tab stops being live.
assert.equal(writeAs(TAB_A, "t6", "att-6", { itemsAttempted: 1, itemsTotal: 4, partialScore: 1 }, false), "owned");
draftAt("t6");
releaseSJTScenario(alice, "appropriateness", "att-6", TAB_A);
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.aliveAt, 0);
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, "tab-a-reloaded")?.owner, "tab-a-reloaded");
assert.equal(isActiveSJTScenarioLive(readActiveSJTScenario(alice, "appropriateness")!, now + 1000 + SJT_ACTIVE_LIVE_MS), false, "Without heartbeats a crashed tab stops being live");
assert.equal(recorded.length, 0);

// ---------- Stale settle on hub or Dashboard load ----------
memory.clear();
recorded.length = 0;
const later = now + 10 * 60_000;
// Released (tab closed) pointer: settled once.
saveActiveSJTScenario(alice, { ...pointer("s1", 2, 1), type: "importance" }, now);
// Pointer shown by a live tab: left alone.
saveActiveSJTScenario(alice, { ...pointer("s2", 1, 1), owner: TAB_A, aliveAt: later - 30_000 }, now);
// Expired pointer, even though its tab still heartbeats: settled.
saveActiveSJTScenario(alice, { ...pointer("s3", 3, 2), type: "ranking", owner: TAB_B, aliveAt: later - 30_000 }, now - DRAFT_TTL_MS);
// Crashed tab (heartbeat stopped), nothing marked: settled, nothing recorded.
saveActiveSJTScenario(alice, { ...pointer("s5", 0, 0), type: "ranking_legacy", owner: TAB_B, aliveAt: now }, now);
// Other scopes are untouched by Alice's settle.
saveActiveSJTScenario(bob, { ...pointer("s4", 1, 1), type: "importance" }, now);
saveActiveSJTScenario("guest", { ...pointer("s6", 1, 1), type: "importance" }, now);
memory.set("unrelated_key", "x");
assert.deepEqual(listActiveSJTScenarioTypes(alice).sort(), ["appropriateness", "importance", "ranking", "ranking_legacy"]);
assert.equal(settleStaleSJTScenariosWith(alice, record, later), 3);
assert.deepEqual(recorded.map((r) => r.questionId).sort(), ["s1", "s3"], "Each stale partial recorded once");
assert.ok(recorded.every((r) => r.userId === "user-alice"));
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.questionId, "s2", "A pointer open in a live tab is kept");
assert.equal(readActiveSJTScenario(bob, "importance")?.questionId, "s4");
assert.equal(readActiveSJTScenario("guest", "importance")?.questionId, "s6");
assert.equal(settleStaleSJTScenariosWith(alice, record, later), 0, "A second load records nothing");
assert.equal(recorded.length, 2);
assert.equal(settleStaleSJTScenariosWith(null, record, later), 0, "Null scope settles nothing");
recorded.length = 0;

// ---------- Guest signs in part way through a scenario ----------
memory.clear();
// Resumable guest scenario: moved (pointer and draft) to the account, nothing recorded, resumes there.
saveActiveSJTScenario("guest", { ...pointer("g1", 1, 1), owner: TAB_A, aliveAt: now }, now);
saveSJTAnswerDraft("guest", "appropriateness", "g1", { itemIndex: 1, itemPhase: "rating", selected: "appropriate", scores: [1] }, now);
// Guest scenario with no draft (cannot resume): its partial is recorded once, to the account.
saveActiveSJTScenario("guest", { ...pointer("g2", 2, 1.5), type: "importance" }, now);
// Guest scenario for a trainer where the account already has one open: recorded to the account, account pointer kept.
saveActiveSJTScenario("guest", { ...pointer("g3", 1, 0.5), type: "ranking" }, now);
saveSJTAnswerDraft("guest", "ranking", "g3", { phase: "answering", answer: { most: "a", least: null } }, now);
saveActiveSJTScenario(alice, { ...pointer("a3", 1, 1), type: "ranking" }, now);
const guestAttempt = readActiveSJTScenario("guest", "appropriateness")?.attemptId;

assert.equal(migrateGuestSJTScenariosWith("user-alice", record, now + 1000), 1);
assert.deepEqual(listActiveSJTScenarioTypes("guest"), [], "No guest pointer is left behind");
assert.equal(hasSJTAnswerDraft("guest", "appropriateness", "g1", now), false, "Guest draft moved, not copied");
assert.equal(hasSJTAnswerDraft("guest", "ranking", "g3", now), false);
const moved = readActiveSJTScenario(alice, "appropriateness");
assert.equal(moved?.questionId, "g1");
assert.equal(moved?.attemptId, guestAttempt, "Same attempt continues under the account");
assert.equal(moved?.aliveAt, 0, "Moved pointer is released so the account's next visit resumes it");
assert.deepEqual(recorded.map((r) => [r.questionId, r.userId]).sort(), [["g2", "user-alice"], ["g3", "user-alice"]], "Unresumable guest partials go to the account");
assert.ok(!recorded.some((r) => r.userId === null), "Nothing recorded as guest");
assert.equal(readActiveSJTScenario(alice, "ranking")?.questionId, "a3");
recorded.length = 0;

// The moved scenario resumes under the account (a new page, new tab id) at the same item.
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 2000, "tab-signed-in")?.questionId, "g1");
assert.deepEqual(loadRatingDraft(alice, "appropriateness", "g1", 4, now + 2000), { itemIndex: 1, itemPhase: "rating", selected: "appropriate", scores: [1] });
// The old guest tab's leave or pagehide finds its guest pointer gone and records nothing.
assert.equal(activeSJTScenarioOwnership("guest", "appropriateness", guestAttempt!, TAB_A), "gone");
assert.equal(settleActiveSJTScenario("guest", "appropriateness", "g1", record, guestAttempt), null);
// Completing it under the account: one claim, no partial anywhere.
assert.ok(claimActiveSJTScenario(alice, "appropriateness", "g1", guestAttempt));
assert.equal(settleStaleSJTScenariosWith(alice, record, now + DRAFT_TTL_MS * 3) + settleStaleSJTScenariosWith("guest", record, now + DRAFT_TTL_MS * 3), 1, "Only the account's own a3 is left to settle");
assert.deepEqual(recorded.map((r) => r.questionId), ["a3"]);
recorded.length = 0;
// Idempotent, and a no-op for guests or when there is nothing to move.
assert.equal(migrateGuestSJTScenariosWith("user-alice", record, now), 0);
assert.equal(migrateGuestSJTScenariosWith(null, record, now), 0);
saveActiveSJTScenario("guest", pointer("g4", 1, 1), now);
assert.equal(migrateGuestSJTScenariosWith("guest", record, now), 0);
assert.equal(readActiveSJTScenario("guest", "appropriateness")?.questionId, "g4", "Guest scope never migrates into itself");
// Expired guest scenario: recorded once to the account, not moved.
assert.equal(migrateGuestSJTScenariosWith("user-bob", record, now + DRAFT_TTL_MS + 1), 0);
assert.deepEqual(recorded.map((r) => [r.questionId, r.userId]), [["g4", "user-bob"]]);
assert.equal(readActiveSJTScenario(bob, "appropriateness"), null);
recorded.length = 0;

// ---------- A tab that lost its attempt still saves the completed result ----------
memory.clear();
recorded.length = 0;
const half = { itemsAttempted: 2, itemsTotal: 4, partialScore: 2 };

// The reported scenario: A answers 2/4, B resumes it (takes ownership), B leaves in-app recording the partial 2/4.
assert.equal(writeAs(TAB_A, "L1", "att-L1", half, false), "owned");
draftAt("L1");
assert.equal(resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B)?.owner, TAB_B);
assert.equal(settleActiveSJTScenario(alice, "appropriateness", "L1", record, "att-L1", now + 1500)?.questionId, "L1", "B leaves: partial recorded");
assert.deepEqual(recorded.map((r) => [r.questionId, r.itemsAttempted]), [["L1", 2]]);
assert.deepEqual(readSJTAttemptSaved(alice, "att-L1", now + 2000)?.state, "partial");
assert.equal(readSJTAttemptSaved(alice, "att-L1", now + 2000)?.localId, "local-L1", "The marker remembers the local partial row");
// A cannot take it back (it was claimed), but finishing it still records the completed attempt, superseding the partial.
assert.equal(writeAs(TAB_A, "L1", "att-L1", { itemsAttempted: 3, itemsTotal: 4, partialScore: 3 }, true, now + 3000), "lost");
const finishA = claimSJTAttemptCompletion(alice, "appropriateness", "L1", "att-L1", now + 4000);
assert.equal(finishA.record, true, "A's completed attempt is saved, not dropped");
assert.equal(finishA.supersedes?.localId, "local-L1", "It supersedes the partial row");
assert.equal(readSJTAttemptSaved(alice, "att-L1", now + 4000)?.state, "complete");
// Exactly once: any later submit of the same attempt (B, or A again) is not recorded.
assert.deepEqual(claimSJTAttemptCompletion(alice, "appropriateness", "L1", "att-L1", now + 5000), { record: false, supersedes: null });
assert.equal(settleStaleSJTScenariosWith(alice, record, now + DRAFT_TTL_MS * 2), 0);
assert.equal(recorded.length, 1, "No further partial");
recorded.length = 0;

// B is closed instead (pagehide releases it) and the hub settles the partial; A then finishes: recorded once, superseding.
assert.equal(writeAs(TAB_A, "L2", "att-L2", half, false), "owned");
draftAt("L2");
resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B);
releaseSJTScenario(alice, "appropriateness", "att-L2", TAB_B);
assert.equal(settleStaleSJTScenariosWith(alice, record, now + 2000), 1);
assert.deepEqual(recorded.map((r) => r.questionId), ["L2"]);
const finishL2 = claimSJTAttemptCompletion(alice, "appropriateness", "L2", "att-L2", now + 3000);
assert.equal(finishL2.record, true);
assert.equal(finishL2.supersedes?.state, "partial");
recorded.length = 0;

// B is closed and nothing settled it yet: A takes the attempt back on its next write and owns it again.
assert.equal(writeAs(TAB_A, "L3", "att-L3", half, false), "owned");
draftAt("L3");
resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B);
assert.equal(writeAs(TAB_A, "L3", "att-L3", half, true, now + 2000), "lost", "Not while B is live");
releaseSJTScenario(alice, "appropriateness", "att-L3", TAB_B);
assert.equal(writeAs(TAB_A, "L3", "att-L3", { itemsAttempted: 3, itemsTotal: 4, partialScore: 2 }, true, now + 3000), "owned", "Released by B: A reclaims it");
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.owner, TAB_A);
assert.equal(readActiveSJTScenario(alice, "appropriateness")?.progress?.itemsAttempted, 3, "A's own progress is written");
assert.equal(heartbeatSJTScenario(alice, "appropriateness", "att-L3", TAB_B, now + 4000), "other", "B (restored) sees it has lost the attempt");
const finishL3 = claimSJTAttemptCompletion(alice, "appropriateness", "L3", "att-L3", now + 5000);
assert.deepEqual(finishL3, { record: true, supersedes: null }, "Owner claim: recorded, nothing to supersede");
assert.equal(claimSJTAttemptCompletion(alice, "appropriateness", "L3", "att-L3", now + 6000).record, false, "B cannot record it again");
assert.equal(recorded.length, 0);

// B's tab froze (no release, heartbeat stopped): A takes it back once B is no longer live.
assert.equal(writeAs(TAB_A, "L4", "att-L4", half, false), "owned");
draftAt("L4");
resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B);
assert.equal(writeAs(TAB_A, "L4", "att-L4", half, true, now + 1000 + SJT_ACTIVE_LIVE_MS - 1), "lost");
assert.equal(writeAs(TAB_A, "L4", "att-L4", half, true, now + 1000 + SJT_ACTIVE_LIVE_MS), "owned", "Silent owner: reclaimed");
claimActiveSJTScenario(alice, "appropriateness", "L4", "att-L4");

// A itself froze in the background (> live window): the hub settles its partial; A wakes, sees it gone, and still records the completion.
assert.equal(writeAs(TAB_A, "L5", "att-L5", half, false), "owned");
assert.equal(settleStaleSJTScenariosWith(alice, record, now + SJT_ACTIVE_LIVE_MS + 1), 1);
assert.equal(heartbeatSJTScenario(alice, "appropriateness", "att-L5", TAB_A, now + SJT_ACTIVE_LIVE_MS + 2), "gone");
const finishL5 = claimSJTAttemptCompletion(alice, "appropriateness", "L5", "att-L5", now + SJT_ACTIVE_LIVE_MS + 3);
assert.equal(finishL5.record, true);
assert.equal(finishL5.supersedes?.localId, "local-L5");
recorded.length = 0;

// B finished it first: A's later submit is told it was completed elsewhere.
assert.equal(writeAs(TAB_A, "L6", "att-L6", half, false), "owned");
draftAt("L6");
resolveSJTResumeWith(alice, "appropriateness", noFilters, record, now + 1000, TAB_B);
assert.deepEqual(claimSJTAttemptCompletion(alice, "appropriateness", "L6", "att-L6", now + 2000), { record: true, supersedes: null }, "B records");
assert.deepEqual(claimSJTAttemptCompletion(alice, "appropriateness", "L6", "att-L6", now + 3000), { record: false, supersedes: null }, "A does not");

// Pointer gone with no marker (claimed, nothing recorded): the completion is recorded.
assert.equal(writeAs(TAB_A, "L7", "att-L7", null, false), "owned");
claimActiveSJTScenario(alice, "appropriateness", "L7", "att-L7");
assert.deepEqual(claimSJTAttemptCompletion(alice, "appropriateness", "L7", "att-L7", now), { record: true, supersedes: null });
assert.equal(recorded.length, 0);

// Markers: per scope, never downgraded, expire after the TTL (and are pruned), corrupt ones ignored; null scope is a no-op.
markSJTAttemptSaved(alice, "m1", "complete", { now });
markSJTAttemptSaved(alice, "m1", "partial", { now: now + 1, localId: "x" });
assert.equal(readSJTAttemptSaved(alice, "m1", now + 2)?.state, "complete", "A completion is never downgraded to partial");
assert.equal(readSJTAttemptSaved(bob, "m1", now + 2), null, "Markers are per scope");
assert.equal(readSJTAttemptSaved(alice, "m1", now + SJT_ATTEMPT_MARKER_TTL_MS + 1), null, "Markers expire");
assert.equal(memory.has(`ucat_sjt_attempt_saved_v1:${alice}:m1`), false, "Expired markers are removed");
markSJTAttemptSaved(alice, "m2", "partial", { now });
markSJTAttemptSaved(alice, "m3", "partial", { now: now + SJT_ATTEMPT_MARKER_TTL_MS + 1 });
assert.equal(memory.has(`ucat_sjt_attempt_saved_v1:${alice}:m2`), false, "Writing a marker prunes expired ones");
memory.set(`ucat_sjt_attempt_saved_v1:${alice}:bad`, "not-json");
assert.equal(readSJTAttemptSaved(alice, "bad", now), null);
markSJTAttemptSaved(null, "m4", "complete", { now });
assert.equal(readSJTAttemptSaved(null, "m4", now), null);
assert.deepEqual(claimSJTAttemptCompletion(null, "appropriateness", "q", "a", now), { record: true, supersedes: null }, "Review mode records directly");

// Guest migration marks what it recorded, in both scopes.
memory.clear();
recorded.length = 0;
saveActiveSJTScenario("guest", { ...pointer("gm", 1, 1), attemptId: "att-gm" }, now);
migrateGuestSJTScenariosWith("user-alice", record, now);
assert.equal(readSJTAttemptSaved("guest", "att-gm", now)?.state, "partial");
assert.equal(readSJTAttemptSaved(alice, "att-gm", now)?.localId, "local-gm");
recorded.length = 0;

console.log("SJT draft recovery checks passed: per-account scope, review-mode opt-out, expiry, unsubmitted-only restore, cleanup, corrupt-state rejection, active-scenario resume (scope, expiry, filters, review opt-out), record-once partials, two-tab ownership and claims, stale settle on hub load, guest-to-account migration, lost-tab reclaim, and completions saved exactly once after another tab recorded a partial.");
