import type { PluginVerifyResult } from "../types.ts";
import { asRecord, str } from "../utils.ts";

const SJT_DOMAINS = new Set([
  "knowledge_skills_development",
  "patients_partnership_communication",
  "colleagues_culture_safety",
  "trust_professionalism",
]);

const APPROPRIATENESS_RATINGS = new Set([
  "very_appropriate",
  "appropriate",
  "inappropriate",
  "very_inappropriate",
]);

const IMPORTANCE_RATINGS = new Set([
  "very_important",
  "important",
  "minor_importance",
  "not_important",
]);

export function verifySjtStructure(
  raw: Record<string, unknown>,
  questionKind: string,
): PluginVerifyResult {
  const issues: string[] = [];
  const domain = str(raw.domain);
  if (!SJT_DOMAINS.has(domain)) issues.push("Invalid domain");

  const items = raw.items;
  if (!Array.isArray(items)) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: "Missing items array.",
    };
  }

  if (questionKind === "ranking") {
    if (items.length !== 3) issues.push("Ranking must have 3 items");
    const ranks = new Set<number>();
    for (const item of items) {
      const rec = asRecord(item);
      const rank = Number(rec?.rank);
      if (![1, 2, 3].includes(rank)) issues.push("Invalid rank");
      ranks.add(rank);
      if (!str(rec?.text)) issues.push("Item missing text");
      if (!str(rec?.rationale)) issues.push("Item missing rationale");
    }
    if (ranks.size !== 3) issues.push("Ranks must be 1, 2, 3 uniquely");
  } else {
    if (items.length !== 4) issues.push("Rating questions must have 4 items");
    const ratings = new Set<string>();
    const allowed =
      questionKind === "importance" ? IMPORTANCE_RATINGS : APPROPRIATENESS_RATINGS;
    for (const item of items) {
      const rec = asRecord(item);
      const rating = str(rec?.correctRating);
      if (!allowed.has(rating)) issues.push(`Invalid rating: ${rating}`);
      ratings.add(rating);
      if (!str(rec?.text)) issues.push("Item missing text");
      if (!str(rec?.rationale)) issues.push("Item missing rationale");
      if (!str(rec?.whyNotAdjacent)) issues.push("Item missing whyNotAdjacent");
    }
    if (ratings.size < 2) issues.push("Ratings should span at least two levels");
  }

  if (!str(raw.pivotInsight)) issues.push("Missing pivotInsight");

  if (issues.length) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: issues.join("; "),
    };
  }
  return {
    ok: true,
    hardFail: false,
    verified: true,
    reviewRecommended: false,
    summary: "SJT structure checks passed.",
  };
}
