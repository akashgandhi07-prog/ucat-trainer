import type { GMCDomainId, SJTQuestionType } from "../types/sjt";
import { persistSJTSession, type GuestSJTSessionPayload } from "./sjtSessionStorage";

const STORAGE_KEY = "ucat_sjt_analytics_v1";
const MAX_RECORDS = 1000;

export interface SJTAttempt {
  id: string;
  timestamp: number;
  questionId: string;
  domain: GMCDomainId;
  type: SJTQuestionType;
  score: number;
  maxScore: number;
}

export interface SJTDomainStats {
  domain: GMCDomainId;
  attempts: number;
  totalScore: number;
  totalMax: number;
  pct: number;
}

export interface SJTOverallStats {
  totalAttempts: number;
  totalScore: number;
  totalMax: number;
  pct: number;
  byDomain: SJTDomainStats[];
  weakestDomain: GMCDomainId | null;
  strongestDomain: GMCDomainId | null;
}

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadAttempts(): SJTAttempt[] {
  if (!storageAvailable()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((attempt): attempt is SJTAttempt => {
      if (!attempt || typeof attempt !== "object") return false;
      const value = attempt as Partial<SJTAttempt>;
      return (
        typeof value.id === "string" &&
        typeof value.timestamp === "number" &&
        typeof value.questionId === "string" &&
        typeof value.domain === "string" &&
        typeof value.type === "string" &&
        typeof value.score === "number" &&
        typeof value.maxScore === "number"
      );
    });
  } catch {
    return [];
  }
}

function saveAttempts(attempts: SJTAttempt[]): void {
  if (!storageAvailable()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(-MAX_RECORDS)));
  } catch {
    // Storage can be unavailable in private browsing or quota-limited environments.
  }
}

export type RecordSJTAttemptInput = Omit<SJTAttempt, "id" | "timestamp"> & {
  completed?: boolean;
  itemsAttempted?: number;
  itemsTotal?: number;
  userId?: string | null;
};

export function recordSJTAttempt(attempt: RecordSJTAttemptInput): void {
  if (attempt.maxScore <= 0) return;

  const completed = attempt.completed ?? true;
  const itemsTotal = attempt.itemsTotal ?? Math.max(1, Math.round(attempt.maxScore));
  const itemsAttempted = attempt.itemsAttempted ?? itemsTotal;

  const attempts = loadAttempts();
  attempts.push({
    questionId: attempt.questionId,
    domain: attempt.domain,
    type: attempt.type,
    score: attempt.score,
    maxScore: attempt.maxScore,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  });
  saveAttempts(attempts);

  const cloudPayload: GuestSJTSessionPayload = {
    question_id: attempt.questionId,
    question_type: attempt.type,
    domain: attempt.domain,
    score: attempt.score,
    max_score: attempt.maxScore,
    items_attempted: itemsAttempted,
    items_total: itemsTotal,
    completed,
  };

  void persistSJTSession(attempt.userId ?? null, cloudPayload);
}

export function getSJTStats(): SJTOverallStats | null {
  const attempts = loadAttempts();
  if (attempts.length === 0) return null;

  const byDomain = new Map<GMCDomainId, { score: number; max: number; count: number }>();

  for (const attempt of attempts) {
    const existing = byDomain.get(attempt.domain) ?? { score: 0, max: 0, count: 0 };
    byDomain.set(attempt.domain, {
      score: existing.score + attempt.score,
      max: existing.max + attempt.maxScore,
      count: existing.count + 1,
    });
  }

  const domainStats: SJTDomainStats[] = Array.from(byDomain.entries()).map(
    ([domain, { score, max, count }]) => ({
      domain,
      attempts: count,
      totalScore: score,
      totalMax: max,
      pct: max > 0 ? Math.round((score / max) * 100) : 0,
    }),
  );

  const sorted = [...domainStats].sort((a, b) => a.pct - b.pct);
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const totalMax = attempts.reduce((sum, attempt) => sum + attempt.maxScore, 0);

  return {
    totalAttempts: attempts.length,
    totalScore,
    totalMax,
    pct: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    byDomain: sorted,
    weakestDomain: sorted.length > 0 ? sorted[0].domain : null,
    strongestDomain: sorted.length > 0 ? sorted[sorted.length - 1].domain : null,
  };
}

export function getSJTDomainStats(domain: GMCDomainId): SJTDomainStats | null {
  const stats = getSJTStats();
  return stats?.byDomain.find((item) => item.domain === domain) ?? null;
}

export function clearSJTData(): void {
  if (!storageAvailable()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
