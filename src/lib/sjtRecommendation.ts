import type { GMCDomainId, SJTQuestionType } from "../types/sjt";

export type SJTRecommendationRow = {
  question_type: SJTQuestionType;
  domain: GMCDomainId;
  score: number;
  max_score: number;
  completed: boolean;
  created_at?: string;
};

export type SJTRecommendation = {
  type: SJTQuestionType;
  domain: GMCDomainId | null;
  reason: "weakest_topic" | "least_practised_type" | "starting_point";
  accuracy?: number;
  evidence?: number;
  confidence?: "early" | "growing" | "strong";
  lastPractisedAt?: string;
};

const TYPES: SJTQuestionType[] = ["appropriateness", "importance", "ranking"];

export function recommendSJTDrill(rows: SJTRecommendationRow[]): SJTRecommendation {
  const valid = rows.filter((row) => row.completed && row.max_score > 0 && row.score >= 0 && row.score <= row.max_score);
  if (!valid.length) return { type: "appropriateness", domain: null, reason: "starting_point" };

  const domains = new Map<GMCDomainId, { score: number; max: number; count: number; lastIndex: number }>();
  valid.forEach((row, index) => {
    const entry = domains.get(row.domain) ?? { score: 0, max: 0, count: 0, lastIndex: -1 };
    entry.score += row.score;
    entry.max += row.max_score;
    entry.count += 1;
    entry.lastIndex = index;
    domains.set(row.domain, entry);
  });
  const weakest = [...domains.entries()]
    .filter(([, value]) => value.count >= 2)
    .sort((a, b) => (a[1].score / a[1].max) - (b[1].score / b[1].max) || a[1].lastIndex - b[1].lastIndex)[0];
  if (weakest) {
    const [domain, evidence] = weakest;
    const matching = valid.filter((row) => row.domain === domain);
    const type = TYPES.map((candidate) => {
      const attempts = matching.filter((row) => row.question_type === candidate);
      const score = attempts.reduce((sum, row) => sum + row.score, 0);
      const max = attempts.reduce((sum, row) => sum + row.max_score, 0);
      return { candidate, count: attempts.length, accuracy: max ? score / max : -1 };
    }).sort((a, b) => a.count - b.count || a.accuracy - b.accuracy)[0].candidate;
    return {
      type,
      domain,
      reason: "weakest_topic",
      accuracy: Math.round((evidence.score / evidence.max) * 100),
      evidence: evidence.count,
      confidence: evidence.count >= 8 ? "strong" : evidence.count >= 4 ? "growing" : "early",
      lastPractisedAt: [...matching].reverse().find((row) => row.created_at)?.created_at,
    };
  }

  const type = TYPES.map((candidate) => ({ candidate, count: valid.filter((row) => row.question_type === candidate).length }))
    .sort((a, b) => a.count - b.count || TYPES.indexOf(a.candidate) - TYPES.indexOf(b.candidate))[0].candidate;
  return { type, domain: null, reason: "least_practised_type", evidence: valid.length, confidence: "early" };
}
