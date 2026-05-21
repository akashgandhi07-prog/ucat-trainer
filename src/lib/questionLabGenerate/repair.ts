import type { QuestionVerifyOutcome, RepairReasonSummary } from "./types.ts";

/** True when AI may attempt a full rewrite (not proven wrong maths). */
export function eligibleForAiRepair(outcome: QuestionVerifyOutcome): boolean {
  if (outcome.qualityStatus === "pass") return false;

  const notes = outcome.qualityNotes;
  const l2 = outcome.layer2;

  if (l2?.hardFail && l2.verified && !l2.ok) return false;
  if (/Solver got/i.test(notes)) return false;
  if (/does not match worked/i.test(notes)) return false;
  if (/Explanation implies .* but correct option/i.test(notes)) return false;

  return outcome.qualityStatus === "fail" || outcome.qualityStatus === "needs_review";
}

/** Human-readable issue list for logs and the repair model prompt. */
export function repairIssuesForPrompt(outcome: QuestionVerifyOutcome): string {
  const parts: string[] = [];
  if (outcome.layer1Issues.length) {
    parts.push(...outcome.layer1Issues.filter((i) => !i.startsWith("(review)")));
  }
  for (const i of outcome.layer1Issues) {
    if (i.startsWith("(review)")) parts.push(i.replace(/^\(review\)\s*/, ""));
  }
  if (outcome.layer2 && !outcome.layer2.ok) parts.push(outcome.layer2.summary);
  if (outcome.layer3?.issues.length) parts.push(...outcome.layer3.issues);
  return parts.join("; ") || outcome.qualityNotes;
}

export function summariseRepairReason(
  outcome: QuestionVerifyOutcome,
  maxLen = 220,
): RepairReasonSummary {
  const reasons = repairIssuesForPrompt(outcome);
  const trimmed =
    reasons.length > maxLen ? `${reasons.slice(0, maxLen - 1)}…` : reasons;
  return {
    legacyId: outcome.legacyId,
    qualityStatus: outcome.qualityStatus,
    reasons: trimmed,
  };
}

export function buildVerifyRepairFeedback(
  outcomes: QuestionVerifyOutcome[],
  repairCandidates: Array<{ outcome: QuestionVerifyOutcome }>,
): {
  repairReasons: RepairReasonSummary[];
  blockedNotRepaired: RepairReasonSummary[];
} {
  const repairIds = new Set(repairCandidates.map((c) => c.outcome.legacyId));
  return {
    repairReasons: repairCandidates.map((c) => summariseRepairReason(c.outcome)),
    blockedNotRepaired: outcomes
      .filter((o) => o.qualityStatus === "fail" && !repairIds.has(o.legacyId))
      .map((o) => summariseRepairReason(o)),
  };
}
