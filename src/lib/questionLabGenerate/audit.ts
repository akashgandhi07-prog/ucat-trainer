import type { AuditScores, AuditVerdict } from "./types.ts";
import type { PluginVerifyResult } from "./types.ts";
import { asRecord } from "./utils.ts";

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function deriveAccuracyFromScores(scores: AuditScores, issueCount: number): number {
  let acc = 100;
  if (!scores.mathsCorrect) acc -= 40;
  if (!scores.oneCorrectAnswer) acc -= 25;
  if (!scores.explanationMatches) acc -= 20;
  if (!scores.ucatStyle) acc -= 15;
  if (issueCount > 0) acc = Math.min(acc, 90 - Math.min(issueCount * 5, 30));
  return clampPercent(acc);
}

export function parseAuditVerdict(raw: string): AuditVerdict {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  try {
    const parsed = asRecord(JSON.parse(text));
    const issues = Array.isArray(parsed?.issues)
      ? (parsed.issues as unknown[]).map((i) => String(i)).filter(Boolean)
      : [];

    const scores: AuditScores = {
      mathsCorrect: parseBool(parsed?.mathsCorrect ?? parsed?.maths_correct, true),
      oneCorrectAnswer: parseBool(
        parsed?.oneCorrectAnswer ?? parsed?.one_correct_answer,
        true,
      ),
      explanationMatches: parseBool(
        parsed?.explanationMatches ?? parsed?.explanation_matches,
        true,
      ),
      ucatStyle: parseBool(parsed?.ucatStyle ?? parsed?.ucat_style, true),
    };

    let accuracyPercent = clampPercent(
      Number(parsed?.accuracyPercent ?? parsed?.accuracy_percent ?? NaN),
    );
    if (!Number.isFinite(Number(parsed?.accuracyPercent ?? parsed?.accuracy_percent))) {
      accuracyPercent = deriveAccuracyFromScores(scores, issues.length);
    }

    const verdict = accuracyPercent === 100 ? "pass" : "needs_review";
    return { verdict, issues, accuracyPercent, scores };
  } catch {
    const scores: AuditScores = {
      mathsCorrect: false,
      oneCorrectAnswer: false,
      explanationMatches: false,
      ucatStyle: false,
    };
    return {
      verdict: "needs_review",
      issues: ["Audit model returned invalid JSON."],
      accuracyPercent: 0,
      scores,
    };
  }
}

export function formatAuditScores(scores: AuditScores): string {
  return [
    `maths ${scores.mathsCorrect ? "ok" : "fail"}`,
    `one answer ${scores.oneCorrectAnswer ? "ok" : "fail"}`,
    `explanation ${scores.explanationMatches ? "ok" : "fail"}`,
    `UCAT style ${scores.ucatStyle ? "ok" : "fail"}`,
  ].join(" · ");
}

/** Code caps: audit cannot claim 100% when deterministic checks disagree. */
export function applyAuditAccuracyCaps(
  audit: AuditVerdict,
  opts: {
    layer1Hard: string[];
    layer1Soft: string[];
    layer2: PluginVerifyResult | null;
  },
): AuditVerdict {
  const scores = { ...audit.scores };
  const issues = [...audit.issues];

  if (opts.layer1Hard.length > 0) {
    scores.ucatStyle = false;
  }
  if (opts.layer2?.hardFail && !opts.layer2.ok) {
    scores.mathsCorrect = false;
    scores.oneCorrectAnswer = false;
  } else if (opts.layer2 && !opts.layer2.verified) {
    scores.mathsCorrect = false;
  }

  const mathsIssue = issues.some((i) =>
    /calculation|math|incorrect answer|wrong answer|does not match|should be \d/i.test(i),
  );
  if (mathsIssue) scores.mathsCorrect = false;

  let accuracyPercent = deriveAccuracyFromScores(scores, issues.length);
  if (opts.layer1Hard.length > 0) accuracyPercent = Math.min(accuracyPercent, 45);
  if (opts.layer1Soft.length > 0) accuracyPercent = Math.min(accuracyPercent, 92);
  if (opts.layer2?.hardFail && !opts.layer2.ok) {
    accuracyPercent = Math.min(accuracyPercent, 25);
  } else if (opts.layer2 && !opts.layer2.verified) {
    accuracyPercent = Math.min(accuracyPercent, 88);
  }

  accuracyPercent = clampPercent(accuracyPercent);
  const verdict = accuracyPercent === 100 ? "pass" : "needs_review";
  return { verdict, issues, accuracyPercent, scores };
}
