import type { AuditVerdict } from "./types.ts";
import type { PluginVerifyResult } from "./types.ts";
import { asRecord } from "./utils.ts";

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
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

    let accuracyPercent = clampPercent(
      Number(parsed?.accuracyPercent ?? parsed?.accuracy_percent ?? NaN),
    );
    if (!Number.isFinite(Number(parsed?.accuracyPercent ?? parsed?.accuracy_percent))) {
      accuracyPercent = parsed?.verdict === "pass" ? 100 : 60;
    }

    const verdict = accuracyPercent === 100 ? "pass" : "needs_review";
    return { verdict, issues, accuracyPercent };
  } catch {
    return {
      verdict: "needs_review",
      issues: ["Audit model returned invalid JSON."],
      accuracyPercent: 0,
    };
  }
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
  let acc = audit.accuracyPercent;
  const issues = [...audit.issues];

  if (opts.layer1Hard.length > 0) {
    acc = Math.min(acc, 45);
  }
  if (opts.layer1Soft.length > 0) {
    acc = Math.min(acc, 92);
  }

  if (opts.layer2?.hardFail && !opts.layer2.ok) {
    acc = Math.min(acc, 25);
  } else if (opts.layer2 && !opts.layer2.verified) {
    acc = Math.min(acc, 88);
  } else if (opts.layer2?.reviewRecommended) {
    acc = Math.min(acc, 90);
  }

  const mathsIssue = issues.some((i) =>
    /calculation|math|incorrect answer|wrong answer|does not match|should be \d/i.test(i),
  );
  if (mathsIssue) acc = Math.min(acc, 50);

  acc = clampPercent(acc);
  const verdict = acc === 100 ? "pass" : "needs_review";
  return { verdict, issues, accuracyPercent: acc };
}
