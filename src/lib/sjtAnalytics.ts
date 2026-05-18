import type { GMCDomainId, SJTQuestionType } from "../types/sjt";

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

function loadAttempts(): SJTAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SJTAttempt[];
  } catch {
    return [];
  }
}

function saveAttempts(attempts: SJTAttempt[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(-MAX_RECORDS)));
  } catch {
    // storage unavailable - fail silently
  }
}

export function recordSJTAttempt(
  attempt: Omit<SJTAttempt, "id" | "timestamp">
): void {
  const attempts = loadAttempts();
  attempts.push({
    ...attempt,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  });
  saveAttempts(attempts);
}

export function getSJTStats(): SJTOverallStats | null {
  const attempts = loadAttempts();
  if (attempts.length === 0) return null;

  const byDomain = new Map<GMCDomainId, { score: number; max: number; count: number }>();

  for (const a of attempts) {
    const d = byDomain.get(a.domain) ?? { score: 0, max: 0, count: 0 };
    byDomain.set(a.domain, {
      score: d.score + a.score,
      max: d.max + a.maxScore,
      count: d.count + 1,
    });
  }

  const domainStats: SJTDomainStats[] = Array.from(byDomain.entries()).map(
    ([domain, { score, max, count }]) => ({
      domain,
      attempts: count,
      totalScore: score,
      totalMax: max,
      pct: max > 0 ? Math.round((score / max) * 100) : 0,
    })
  );

  const sorted = [...domainStats].sort((a, b) => a.pct - b.pct);
  const totalScore = attempts.reduce((s, a) => s + a.score, 0);
  const totalMax = attempts.reduce((s, a) => s + a.maxScore, 0);

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
  return stats?.byDomain.find((d) => d.domain === domain) ?? null;
}

export function clearSJTData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
