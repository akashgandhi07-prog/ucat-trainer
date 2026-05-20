import type { AuditVerdict } from "./types.ts";
import { asRecord } from "./utils.ts";

export function parseAuditVerdict(raw: string): AuditVerdict {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  try {
    const parsed = asRecord(JSON.parse(text));
    const verdict = parsed?.verdict === "pass" ? "pass" : "needs_review";
    const issues = Array.isArray(parsed?.issues)
      ? (parsed.issues as unknown[]).map((i) => String(i)).filter(Boolean)
      : [];
    return { verdict, issues };
  } catch {
    return { verdict: "needs_review", issues: ["Audit model returned invalid JSON."] };
  }
}
