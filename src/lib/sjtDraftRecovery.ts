import type { RankingAnswer, SJTRating } from "../types/sjt";

/**
 * Best-effort recovery of an unsubmitted SJT answer after an accidental reload.
 *
 * Drafts are scoped per account (or "guest") and question, expire after
 * DRAFT_TTL_MS, and only ever hold the unsubmitted answering state: nothing that
 * has been marked or had its explanation revealed is restored. Callers pass a
 * null scope (for example in delayed-review mode) to disable drafts entirely.
 */
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = "ucat_sjt_draft_v2";
const LEGACY_PREFIX = "ucat_sjt_draft_v1";

export type RatingDraft = { itemIndex: number; itemPhase: "rating"; selected: SJTRating | null; scores: Array<0 | 0.5 | 1> };
export type RankingDraft = { phase: "answering"; answer: RankingAnswer };
type Stored<T> = T & { savedAt: number };

/** Scope used for draft keys: the signed-in user id, or "guest". */
export function sjtDraftScope(userId: string | null | undefined): string {
  return userId ? userId : "guest";
}

const key = (scope: string, type: string, id: string) => `${PREFIX}:${scope}:${type}:${id}`;

function readStored(scope: string, type: string, id: string, now: number): Record<string, unknown> | null {
  try {
    // Unscoped v1 drafts could leak between accounts and restore marked answers; drop them.
    localStorage.removeItem(`${LEGACY_PREFIX}:${type}:${id}`);
  } catch { /* ignore */ }
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key(scope, type, id)) ?? "null");
    if (!value || typeof value !== "object") return null;
    const savedAt = (value as { savedAt?: unknown }).savedAt;
    if (typeof savedAt !== "number" || !Number.isFinite(savedAt) || savedAt > now + 60_000 || now - savedAt > DRAFT_TTL_MS) {
      clearSJTAnswerDraft(scope, type, id);
      return null;
    }
    return value as Record<string, unknown>;
  } catch { return null; }
}

export function loadRatingDraft(scope: string | null, type: string, id: string, itemCount: number, now = Date.now()): RatingDraft | null {
  if (!scope) return null;
  const value = readStored(scope, type, id, now);
  if (!value) return null;
  const { itemIndex, itemPhase, selected, scores } = value;
  if (typeof itemIndex !== "number" || !Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= itemCount) return null;
  // Only the answering phase is recoverable; a feedback state would reveal the key.
  if (itemPhase !== "rating") return null;
  if (!Array.isArray(scores) || scores.length !== itemIndex || scores.some((score) => ![0, 0.5, 1].includes(score as number))) return null;
  if (selected !== null && selected !== undefined && typeof selected !== "string") return null;
  return { itemIndex, itemPhase: "rating", selected: (selected as SJTRating | null | undefined) ?? null, scores: scores as Array<0 | 0.5 | 1> };
}

export function loadRankingDraft(scope: string | null, type: string, id: string, now = Date.now()): RankingDraft | null {
  if (!scope) return null;
  const value = readStored(scope, type, id, now);
  if (!value) return null;
  // Submitted rankings ("results") are never restored.
  if (value.phase !== "answering" || !value.answer || typeof value.answer !== "object") return null;
  const { most, least } = value.answer as RankingAnswer;
  if ((most !== null && typeof most !== "string") || (least !== null && typeof least !== "string")) return null;
  return { phase: "answering", answer: { most, least } };
}

export function saveSJTAnswerDraft(scope: string | null, type: string, id: string, value: RatingDraft | RankingDraft, now = Date.now()): void {
  if (!scope) return;
  const stored: Stored<RatingDraft | RankingDraft> = { ...value, savedAt: now };
  try { localStorage.setItem(key(scope, type, id), JSON.stringify(stored)); } catch { /* recovery is best effort */ }
}

export function clearSJTAnswerDraft(scope: string | null, type: string, id: string): void {
  if (!scope) return;
  try { localStorage.removeItem(key(scope, type, id)); } catch { /* ignore */ }
}

/** True when a fresh (unexpired) answer draft exists for this question. */
export function hasSJTAnswerDraft(scope: string | null, type: string, id: string, now = Date.now()): boolean {
  if (!scope) return false;
  return readStored(scope, type, id, now) !== null;
}


/**
 * Active scenario pointer: which scenario a user (or guest) was part way through
 * for each trainer type, so an accidental reload reopens the same scenario
 * instead of a new random one. It also carries the progress needed to record a
 * partial attempt if the scenario is later discarded without being resumed.
 *
 * Record-once rule: every scenario attempt has an attemptId, and a row is only
 * ever recorded by whoever *claims* (reads and removes) the pointer carrying
 * that attemptId. Submitting claims before recording the completed attempt, so
 * a resumed-then-completed scenario never also records a partial.
 *
 * Several tabs: the pointer names the tab that owns it (`owner`) and when that
 * tab last showed it (`aliveAt`, refreshed by a heartbeat and set to 0 on
 * pagehide). A tab that resumes a scenario takes ownership; the previous owner
 * sees the change (storage event, or on its next write) and stops treating the
 * attempt as its own: it never records on pagehide or leave, and on submit it
 * records only if it can still claim the pointer, i.e. the owner has not
 * recorded it yet. A pointer shown by a live tab is never settled by another.
 */
const ACTIVE_PREFIX = "ucat_sjt_active_v1";
/** A pointer counts as open in some tab while its heartbeat is this recent (background tabs tick about once a minute). */
export const SJT_ACTIVE_LIVE_MS = 3 * 60_000;
export const SJT_ACTIVE_HEARTBEAT_MS = 30_000;

export type SJTScenarioProgress = { itemsAttempted: number; itemsTotal: number; partialScore: number };
export type SJTScenarioFilters = { domain: string; difficulty: string };
export type ActiveSJTScenario = {
  type: string;
  questionId: string;
  domain: string;
  filters: SJTScenarioFilters;
  progress: SJTScenarioProgress | null;
  savedAt: number;
  /** Identifies this attempt at the scenario; a row is recorded once per attemptId. */
  attemptId: string;
  /** Tab id of the tab showing it ("" when none has claimed it yet). */
  owner: string;
  /** Last heartbeat from the owner tab; 0 once released (page hidden or unloaded). */
  aliveAt: number;
};
export type ActiveSJTScenarioInput = Omit<ActiveSJTScenario, "savedAt" | "attemptId" | "owner" | "aliveAt"> &
  Partial<Pick<ActiveSJTScenario, "attemptId" | "owner" | "aliveAt">>;

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const TAB_ID = randomId();
/** Stable for the lifetime of this page load; a reload gets a new one. */
export const sjtTabId = () => TAB_ID;
export const newSJTAttemptId = () => randomId();

const activeKey = (scope: string, type: string) => `${ACTIVE_PREFIX}:${scope}:${type}`;
/** True when a storage key is an active-scenario pointer (for storage event filtering). */
export const isActiveSJTScenarioKey = (key: string | null) => key === null || key.startsWith(`${ACTIVE_PREFIX}:`);

function isProgress(value: unknown): value is SJTScenarioProgress {
  if (!value || typeof value !== "object") return false;
  const { itemsAttempted, itemsTotal, partialScore } = value as Record<string, unknown>;
  return (
    typeof itemsAttempted === "number" && Number.isInteger(itemsAttempted) && itemsAttempted >= 0 &&
    typeof itemsTotal === "number" && Number.isInteger(itemsTotal) && itemsTotal > 0 && itemsAttempted <= itemsTotal &&
    typeof partialScore === "number" && Number.isFinite(partialScore) && partialScore >= 0 && partialScore <= itemsTotal
  );
}

/** The stored pointer for this scope and type (expired or not), or null. Corrupt pointers are removed. */
export function readActiveSJTScenario(scope: string | null, type: string): ActiveSJTScenario | null {
  if (!scope) return null;
  let raw: string | null = null;
  try { raw = localStorage.getItem(activeKey(scope, type)); } catch { return null; }
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown> | null;
    const filters = v?.filters as Record<string, unknown> | undefined;
    if (
      v && typeof v === "object" && v.type === type &&
      typeof v.questionId === "string" && v.questionId.length > 0 &&
      typeof v.domain === "string" &&
      filters && typeof filters.domain === "string" && typeof filters.difficulty === "string" &&
      (v.progress === null || isProgress(v.progress)) &&
      typeof v.savedAt === "number" && Number.isFinite(v.savedAt)
    ) {
      return {
        type, questionId: v.questionId, domain: v.domain,
        filters: { domain: filters.domain, difficulty: filters.difficulty },
        progress: (v.progress as SJTScenarioProgress | null) ?? null,
        savedAt: v.savedAt,
        // Pointers written before tab ownership existed: one legacy attempt, owned by nobody.
        attemptId: typeof v.attemptId === "string" && v.attemptId ? v.attemptId : `legacy-${v.savedAt}`,
        owner: typeof v.owner === "string" ? v.owner : "",
        aliveAt: typeof v.aliveAt === "number" && Number.isFinite(v.aliveAt) ? v.aliveAt : 0,
      };
    }
  } catch { /* fall through */ }
  try { localStorage.removeItem(activeKey(scope, type)); } catch { /* ignore */ }
  return null;
}

function writeActivePointer(scope: string, pointer: ActiveSJTScenario): boolean {
  try {
    localStorage.setItem(activeKey(scope, pointer.type), JSON.stringify(pointer));
    return true;
  } catch { return false; }
}

/** Saves the pointer; returns false when storage is unavailable (nothing can then be resumed). */
export function saveActiveSJTScenario(scope: string | null, value: ActiveSJTScenarioInput, now = Date.now()): boolean {
  if (!scope) return false;
  return writeActivePointer(scope, {
    ...value,
    attemptId: value.attemptId ?? randomId(),
    owner: value.owner ?? "",
    aliveAt: value.aliveAt ?? 0,
    savedAt: now,
  });
}

export function clearActiveSJTScenario(scope: string | null, type: string): void {
  if (!scope) return;
  try { localStorage.removeItem(activeKey(scope, type)); } catch { /* ignore */ }
}

/** Trainer types with a stored pointer in this scope (a scan of the pointer key prefix only). */
export function listActiveSJTScenarioTypes(scope: string | null): string[] {
  if (!scope) return [];
  const prefix = `${ACTIVE_PREFIX}:${scope}:`;
  const types: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k.length > prefix.length) types.push(k.slice(prefix.length));
    }
  } catch { /* storage unavailable */ }
  return types;
}

/**
 * Takes the pointer (and its answer draft) out of storage and returns it.
 * When questionId or attemptId is given, a pointer for a different scenario or
 * attempt is left alone and null is returned. Whoever gets the pointer back is
 * the only one allowed to record that attempt.
 */
export function claimActiveSJTScenario(scope: string | null, type: string, questionId?: string, attemptId?: string): ActiveSJTScenario | null {
  const pointer = readActiveSJTScenario(scope, type);
  if (!pointer) return null;
  if (questionId !== undefined && pointer.questionId !== questionId) return null;
  if (attemptId !== undefined && pointer.attemptId !== attemptId) return null;
  clearActiveSJTScenario(scope, type);
  clearSJTAnswerDraft(scope, type, pointer.questionId);
  return pointer;
}

const isExpiredPointer = (pointer: ActiveSJTScenario, now: number) =>
  pointer.savedAt > now + 60_000 || now - pointer.savedAt > DRAFT_TTL_MS;

/** True while some tab (possibly this one) has shown the pointer recently and not released it. */
export function isActiveSJTScenarioLive(pointer: ActiveSJTScenario, now = Date.now()): boolean {
  return pointer.aliveAt > 0 && pointer.aliveAt <= now + 60_000 && now - pointer.aliveAt < SJT_ACTIVE_LIVE_MS;
}

/** A pointer is resumable while fresh, for the same practice filters, and with its unmarked draft still present. */
export function isActiveSJTScenarioResumable(
  pointer: ActiveSJTScenario,
  opts: { filters: SJTScenarioFilters; hasDraft: boolean; now?: number },
): boolean {
  const now = opts.now ?? Date.now();
  if (isExpiredPointer(pointer, now)) return false;
  if (pointer.filters.domain !== opts.filters.domain || pointer.filters.difficulty !== opts.filters.difficulty) return false;
  if (pointer.progress && pointer.progress.itemsAttempted >= pointer.progress.itemsTotal) return false;
  return opts.hasDraft;
}

export type SJTPointerOwnership = "owner" | "other" | "gone";

/** Whether tabId still owns this attempt ("other": another tab took it over; "gone": it was claimed and recorded). */
export function activeSJTScenarioOwnership(scope: string | null, type: string, attemptId: string, tabId: string): SJTPointerOwnership {
  const pointer = readActiveSJTScenario(scope, type);
  if (!pointer || pointer.attemptId !== attemptId) return "gone";
  return pointer.owner === tabId ? "owner" : "other";
}

/** Makes tabId the owner of this attempt (used when a tab resumes it). Returns the updated pointer or null. */
export function takeOwnershipOfSJTScenario(scope: string | null, type: string, attemptId: string, tabId: string, now = Date.now()): ActiveSJTScenario | null {
  if (!scope) return null;
  const pointer = readActiveSJTScenario(scope, type);
  if (!pointer || pointer.attemptId !== attemptId) return null;
  const next = { ...pointer, owner: tabId, aliveAt: now };
  return writeActivePointer(scope, next) ? next : null;
}

/** Owner heartbeat: refreshes aliveAt. Returns the ownership seen, so a caller learns it has lost the pointer. */
export function heartbeatSJTScenario(scope: string | null, type: string, attemptId: string, tabId: string, now = Date.now()): SJTPointerOwnership {
  const pointer = readActiveSJTScenario(scope, type);
  if (!scope || !pointer || pointer.attemptId !== attemptId) return "gone";
  if (pointer.owner !== tabId) return "other";
  writeActivePointer(scope, { ...pointer, aliveAt: now });
  return "owner";
}

/** Owner leaves the page without discarding the scenario (a reload may resume it): it is no longer live. */
export function releaseSJTScenario(scope: string | null, type: string, attemptId: string, tabId: string): void {
  const pointer = readActiveSJTScenario(scope, type);
  if (!scope || !pointer || pointer.attemptId !== attemptId || pointer.owner !== tabId) return;
  writeActivePointer(scope, { ...pointer, aliveAt: 0 });
}

/** The partial attempt a discarded pointer should record, or null when nothing was marked. */
export function partialFromActiveSJTScenario(pointer: ActiveSJTScenario | null): SJTScenarioProgress | null {
  const progress = pointer?.progress;
  if (!progress || progress.itemsAttempted <= 0 || progress.itemsAttempted >= progress.itemsTotal) return null;
  return progress;
}

export type SJTPartialRecorder = (userId: string | null, scenario: ActiveSJTScenario, progress: SJTScenarioProgress) => void;

/** Draft scopes are the user id or "guest"; guest attempts are saved without a user id. */
export const userIdForSJTDraftScope = (scope: string) => (scope === "guest" ? null : scope);

/**
 * Discards the active scenario (optionally only if it is questionId / attemptId)
 * and records its partial attempt exactly once: the pointer is claimed before
 * anything is recorded, so a repeat call (from any tab) finds nothing.
 */
export function settleActiveSJTScenario(
  scope: string | null, type: string, questionId: string | undefined, record: SJTPartialRecorder, attemptId?: string,
): ActiveSJTScenario | null {
  if (!scope) return null;
  const pointer = claimActiveSJTScenario(scope, type, questionId, attemptId);
  const partial = partialFromActiveSJTScenario(pointer);
  if (pointer && partial) record(userIdForSJTDraftScope(scope), pointer, partial);
  return pointer;
}

export type SJTPointerWrite = "owned" | "lost" | "blocked" | "unavailable";

/**
 * Writes this tab's pointer for an attempt it is showing.
 * - "owned": written; this tab owns the attempt.
 * - "lost": the tab owned it before, but another tab has since taken it over or claimed it; nothing written.
 * - "blocked": another live tab is on a different scenario of this trainer; nothing written (the attempt runs without a pointer).
 * - "unavailable": storage failed.
 * A different, no longer live pointer in the slot is settled (recorded once) first.
 */
export function writeOwnedSJTScenario(
  scope: string | null,
  value: Omit<ActiveSJTScenarioInput, "owner" | "aliveAt"> & { attemptId: string },
  opts: { tabId: string; previouslyOwned: boolean; record: SJTPartialRecorder; now?: number },
): SJTPointerWrite {
  if (!scope) return "unavailable";
  const now = opts.now ?? Date.now();
  const existing = readActiveSJTScenario(scope, value.type);
  if (existing && existing.attemptId === value.attemptId) {
    if (existing.owner !== opts.tabId) return "lost";
  } else if (opts.previouslyOwned) {
    return "lost";
  } else if (existing) {
    if (!isExpiredPointer(existing, now) && isActiveSJTScenarioLive(existing, now) && existing.owner !== opts.tabId) return "blocked";
    settleActiveSJTScenario(scope, value.type, existing.questionId, opts.record, existing.attemptId);
  }
  return saveActiveSJTScenario(scope, { ...value, owner: opts.tabId, aliveAt: now }, now) ? "owned" : "unavailable";
}

/**
 * On opening a trainer: the scenario to reopen (now owned by tabId), or null.
 * A pointer that cannot be resumed (expired, other filters, draft gone) is
 * settled, recording its partial attempt once, unless another tab is still
 * showing it.
 */
export function resolveSJTResumeWith(
  scope: string | null, type: string, filters: SJTScenarioFilters, record: SJTPartialRecorder, now = Date.now(), tabId = sjtTabId(),
): ActiveSJTScenario | null {
  if (!scope) return null;
  const pointer = readActiveSJTScenario(scope, type);
  if (!pointer) return null;
  const hasDraft = hasSJTAnswerDraft(scope, type, pointer.questionId, now);
  if (isActiveSJTScenarioResumable(pointer, { filters, hasDraft, now })) {
    return takeOwnershipOfSJTScenario(scope, type, pointer.attemptId, tabId, now);
  }
  if (!isExpiredPointer(pointer, now) && isActiveSJTScenarioLive(pointer, now) && pointer.owner !== tabId) return null;
  settleActiveSJTScenario(scope, type, pointer.questionId, record, pointer.attemptId);
  return null;
}

/**
 * Hub or Dashboard load: settles every pointer in this scope that is expired or
 * not open in any tab, recording each partial once. Returns how many were settled.
 */
export function settleStaleSJTScenariosWith(scope: string | null, record: SJTPartialRecorder, now = Date.now()): number {
  let settled = 0;
  for (const type of listActiveSJTScenarioTypes(scope)) {
    const pointer = readActiveSJTScenario(scope, type);
    if (!pointer) continue;
    if (!isExpiredPointer(pointer, now) && isActiveSJTScenarioLive(pointer, now)) continue;
    if (settleActiveSJTScenario(scope, type, pointer.questionId, record, pointer.attemptId)) settled++;
  }
  return settled;
}

/**
 * Sign-in: moves each guest pointer (and its unmarked draft) to the account, so
 * the same scenario resumes there and its result is recorded to the account.
 * When it cannot be moved (expired, draft gone, finished, or the account
 * already has a scenario open for that trainer) its partial is recorded once to
 * the account instead. The guest pointer is claimed first, so nothing is ever
 * recorded both as guest and as the user.
 */
export function migrateGuestSJTScenariosWith(userId: string | null, record: SJTPartialRecorder, now = Date.now()): number {
  if (!userId || userId === "guest") return 0;
  let moved = 0;
  for (const type of listActiveSJTScenarioTypes("guest")) {
    const pointer = readActiveSJTScenario("guest", type);
    if (!pointer) continue;
    let rawDraft: string | null = null;
    try { rawDraft = hasSJTAnswerDraft("guest", type, pointer.questionId, now) ? localStorage.getItem(key("guest", type, pointer.questionId)) : null; } catch { rawDraft = null; }
    if (!claimActiveSJTScenario("guest", type, pointer.questionId, pointer.attemptId)) continue;
    const complete = !!pointer.progress && pointer.progress.itemsAttempted >= pointer.progress.itemsTotal;
    const canMove = rawDraft !== null && !complete && !isExpiredPointer(pointer, now) && !readActiveSJTScenario(userId, type);
    if (canMove) {
      let draftMoved = false;
      try { localStorage.setItem(key(userId, type, pointer.questionId), rawDraft as string); draftMoved = true; } catch { /* fall through */ }
      // Released (aliveAt 0) so the account's next trainer visit, in any tab, resumes it.
      if (draftMoved && writeActivePointer(userId, { ...pointer, aliveAt: 0 })) {
        moved++;
        continue;
      }
      clearSJTAnswerDraft(userId, type, pointer.questionId);
    }
    const partial = partialFromActiveSJTScenario(pointer);
    if (partial) record(userId, pointer, partial);
  }
  return moved;
}
