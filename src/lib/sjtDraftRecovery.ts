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
 * Record-once rule: whoever records a partial first *claims* (reads and removes)
 * the pointer; submitting a scenario clears the pointer before the completed
 * attempt is recorded, so a resumed-then-completed scenario never also records
 * a partial.
 */
const ACTIVE_PREFIX = "ucat_sjt_active_v1";

export type SJTScenarioProgress = { itemsAttempted: number; itemsTotal: number; partialScore: number };
export type SJTScenarioFilters = { domain: string; difficulty: string };
export type ActiveSJTScenario = {
  type: string;
  questionId: string;
  domain: string;
  filters: SJTScenarioFilters;
  progress: SJTScenarioProgress | null;
  savedAt: number;
};

const activeKey = (scope: string, type: string) => `${ACTIVE_PREFIX}:${scope}:${type}`;

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
      };
    }
  } catch { /* fall through */ }
  try { localStorage.removeItem(activeKey(scope, type)); } catch { /* ignore */ }
  return null;
}

/** Saves the pointer; returns false when storage is unavailable (nothing can then be resumed). */
export function saveActiveSJTScenario(scope: string | null, value: Omit<ActiveSJTScenario, "savedAt">, now = Date.now()): boolean {
  if (!scope) return false;
  try {
    localStorage.setItem(activeKey(scope, value.type), JSON.stringify({ ...value, savedAt: now }));
    return true;
  } catch { return false; }
}

export function clearActiveSJTScenario(scope: string | null, type: string): void {
  if (!scope) return;
  try { localStorage.removeItem(activeKey(scope, type)); } catch { /* ignore */ }
}

/**
 * Atomically (within a tab) takes ownership of the pointer: returns it and
 * removes it together with its answer draft. When questionId is given, a
 * pointer for a different scenario is left alone and null is returned.
 */
export function claimActiveSJTScenario(scope: string | null, type: string, questionId?: string): ActiveSJTScenario | null {
  const pointer = readActiveSJTScenario(scope, type);
  if (!pointer || (questionId !== undefined && pointer.questionId !== questionId)) return null;
  clearActiveSJTScenario(scope, type);
  clearSJTAnswerDraft(scope, type, pointer.questionId);
  return pointer;
}

/** A pointer is resumable while fresh, for the same practice filters, and with its unmarked draft still present. */
export function isActiveSJTScenarioResumable(
  pointer: ActiveSJTScenario,
  opts: { filters: SJTScenarioFilters; hasDraft: boolean; now?: number },
): boolean {
  const now = opts.now ?? Date.now();
  if (pointer.savedAt > now + 60_000 || now - pointer.savedAt > DRAFT_TTL_MS) return false;
  if (pointer.filters.domain !== opts.filters.domain || pointer.filters.difficulty !== opts.filters.difficulty) return false;
  if (pointer.progress && pointer.progress.itemsAttempted >= pointer.progress.itemsTotal) return false;
  return opts.hasDraft;
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
 * Discards the active scenario (optionally only if it is questionId) and records
 * its partial attempt exactly once: the pointer is claimed before anything is
 * recorded, so a repeat call finds nothing.
 */
export function settleActiveSJTScenario(scope: string | null, type: string, questionId: string | undefined, record: SJTPartialRecorder): ActiveSJTScenario | null {
  if (!scope) return null;
  const pointer = claimActiveSJTScenario(scope, type, questionId);
  const partial = partialFromActiveSJTScenario(pointer);
  if (pointer && partial) record(userIdForSJTDraftScope(scope), pointer, partial);
  return pointer;
}

/**
 * On opening a trainer: the scenario to reopen, or null. A pointer that cannot
 * be resumed (expired, other filters, draft gone) is settled, recording its
 * partial attempt once.
 */
export function resolveSJTResumeWith(scope: string | null, type: string, filters: SJTScenarioFilters, record: SJTPartialRecorder, now = Date.now()): ActiveSJTScenario | null {
  if (!scope) return null;
  const pointer = readActiveSJTScenario(scope, type);
  if (!pointer) return null;
  const hasDraft = hasSJTAnswerDraft(scope, type, pointer.questionId, now);
  if (isActiveSJTScenarioResumable(pointer, { filters, hasDraft, now })) return pointer;
  settleActiveSJTScenario(scope, type, pointer.questionId, record);
  return null;
}
