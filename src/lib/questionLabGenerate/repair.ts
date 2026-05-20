import type { QuestionVerifyOutcome } from "./types.ts";

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
