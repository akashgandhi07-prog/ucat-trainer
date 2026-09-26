import type { GMCDomainId, SJTQuestion, SJTQuestionType } from "../types/sjt";
import { GMC_DOMAINS } from "../data/gmcDomains";

export type ReviewEntry = { id: string; type: SJTQuestionType; domain: GMCDomainId; due: number; successes: number };
const DAY = 86_400_000;
const key = (userId?: string | null) => `ucat_sjt_review_v1:${userId ?? "guest"}`;
const statsKey = (userId?: string | null) => `ucat_sjt_review_stats_v1:${userId ?? "guest"}`;
export type SJTReviewStats = { cleared: number };
export function loadSJTReviewStats(userId?: string | null): SJTReviewStats {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(statsKey(userId)) ?? "{}");
    if (!data || typeof data !== "object") return { cleared: 0 };
    const cleared = (data as { cleared?: unknown }).cleared;
    return { cleared: Number.isInteger(cleared) && Number(cleared) >= 0 ? Number(cleared) : 0 };
  } catch { return { cleared: 0 }; }
}
export function loadSJTReviews(userId?: string | null): ReviewEntry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter((r): r is ReviewEntry => r && typeof r.id === "string" &&
      ["appropriateness", "importance", "ranking"].includes(r.type) &&
      Object.hasOwn(GMC_DOMAINS, r.domain) && Number.isFinite(r.due) &&
      Number.isInteger(r.successes) && r.successes >= 0 && r.successes < 2).slice(-300);
  } catch { return []; }
}
export function nextReviewEntry(previous: ReviewEntry | undefined, question: Pick<SJTQuestion, "id" | "type" | "domain">, score: number, max: number, now: number): ReviewEntry | null {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || score < 0 || score > max) return previous ?? null;
  if (score < max) return { id: question.id, type: question.type, domain: question.domain, due: now + DAY, successes: 0 };
  if (!previous || previous.due > now) return previous ?? null;
  if (previous.successes >= 1) return null;
  return { ...previous, successes: 1, due: now + 3 * DAY };
}
export function saveSJTReview(userId: string | null, question: SJTQuestion, score: number, max: number): boolean {
  const entries = loadSJTReviews(userId);
  const next = nextReviewEntry(entries.find(r => r.id === question.id && r.type === question.type), question, score, max, Date.now());
  const remaining = entries.filter(r => r.id !== question.id || r.type !== question.type);
  if (next) remaining.push(next);
  try {
    localStorage.setItem(key(userId), JSON.stringify(remaining.slice(-300)));
    if (previousCleared(entries, question, next, score, max)) {
      const stats = loadSJTReviewStats(userId);
      localStorage.setItem(statsKey(userId), JSON.stringify({ cleared: stats.cleared + 1 }));
    }
    window.dispatchEvent(new Event("sjt-review-updated"));
    return true;
  } catch { return false; }
}

function previousCleared(entries: ReviewEntry[], question: SJTQuestion, next: ReviewEntry | null, score: number, max: number): boolean {
  const previous = entries.find(r => r.id === question.id && r.type === question.type);
  return next === null && score === max && Boolean(previous && previous.successes >= 1 && previous.due <= Date.now());
}
export function sjtPracticePath(type: SJTQuestionType): string {
  return `/ucat-sjt-${type}-trainer`;
}

export function removeSJTReview(userId: string | null, id: string, type: SJTQuestionType): boolean {
  try {
    localStorage.setItem(key(userId), JSON.stringify(loadSJTReviews(userId).filter(r => r.id !== id || r.type !== type)));
    window.dispatchEvent(new Event("sjt-review-updated"));
    return true;
  } catch { return false; }
}

export function snoozeSJTReview(userId: string | null, id: string, type: SJTQuestionType, now = Date.now()): boolean {
  const entries = loadSJTReviews(userId);
  const target = entries.find((entry) => entry.id === id && entry.type === type);
  if (!target) return false;
  return replaceSJTReviewState(userId, entries.map((entry) => entry === target ? { ...entry, due: now + DAY } : entry), loadSJTReviewStats(userId).cleared);
}

export function replaceSJTReviewState(userId: string | null, entries: ReviewEntry[], cleared: number): boolean {
  try {
    localStorage.setItem(key(userId), JSON.stringify(entries.slice(-300)));
    localStorage.setItem(statsKey(userId), JSON.stringify({ cleared: Math.max(0, Math.floor(cleared)) }));
    window.dispatchEvent(new Event("sjt-review-updated"));
    return true;
  } catch { return false; }
}

export function resetSJTReviewState(userId: string | null): boolean {
  return replaceSJTReviewState(userId, [], 0);
}

/** Review row as stored in sjt_review_items (the columns the sync reads). */
export type CloudSJTReviewRow = {
  question_id: string;
  question_type: ReviewEntry["type"];
  domain: ReviewEntry["domain"];
  due_at: string | null;
  successes: number;
  cleared_at: string | null;
  updated_at: string;
};

const reviewItemKey = (type: string, id: string) => `${type}:${id}`;

/**
 * When an entry's latest outcome happened: its due date minus the interval that
 * outcome scheduled (1 day after a miss, 3 days after the first due success).
 * Comparable across devices, unlike updated_at, which every upload bumps.
 */
export function reviewEntryEventTime(entry: Pick<ReviewEntry, "due" | "successes">): number {
  return entry.due - (entry.successes >= 1 ? 3 : 1) * DAY;
}

/** True when `local` reflects a later outcome than `cloud` (ties keep the cloud copy). */
export function isLocalReviewNewer(local: ReviewEntry, cloud: ReviewEntry): boolean {
  const localAt = reviewEntryEventTime(local);
  const cloudAt = reviewEntryEventTime(cloud);
  if (localAt !== cloudAt) return localAt > cloudAt;
  return local.successes > cloud.successes;
}

/**
 * Merges the local review queue with the cloud rows for this user.
 * - upload: local entries the cloud does not have, or has an older outcome for.
 *   A cloud row is never overwritten with an older local copy.
 * - active: the merged queue (newest outcome per scenario) to keep locally.
 * Scenarios cleared or removed in the cloud (cleared_at set) are dropped locally
 * and never re-uploaded.
 */
export function planSJTReviewSync(local: ReviewEntry[], cloudRows: CloudSJTReviewRow[]): { upload: ReviewEntry[]; active: ReviewEntry[] } {
  const clearedKeys = new Set<string>();
  const cloudActive = new Map<string, ReviewEntry>();
  for (const row of cloudRows) {
    const itemKey = reviewItemKey(row.question_type, row.question_id);
    if (row.cleared_at) { clearedKeys.add(itemKey); continue; }
    const due = row.due_at ? new Date(row.due_at).getTime() : NaN;
    if (!Number.isFinite(due)) continue;
    const entry: ReviewEntry = { id: row.question_id, type: row.question_type, domain: row.domain, due, successes: row.successes };
    const previous = cloudActive.get(itemKey);
    if (!previous || isLocalReviewNewer(entry, previous)) cloudActive.set(itemKey, entry);
  }
  const upload: ReviewEntry[] = [];
  const merged = new Map(cloudActive);
  for (const entry of local) {
    const itemKey = reviewItemKey(entry.type, entry.id);
    if (clearedKeys.has(itemKey)) continue;
    const cloud = merged.get(itemKey);
    if (cloud && !isLocalReviewNewer(entry, cloud)) continue;
    merged.set(itemKey, entry);
    upload.push(entry);
  }
  return { upload, active: [...merged.values()] };
}
