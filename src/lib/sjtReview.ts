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
