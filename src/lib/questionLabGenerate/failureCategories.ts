import type { AuditVerdict } from "./types.ts";
import type { PluginVerifyResult } from "./types.ts";

export type FailureCategory =
  | "maths_error"
  | "ambiguous_wording"
  | "bad_distractors"
  | "json_shape_error"
  | "copy_style"
  | "duplicate";

const CATEGORY_ORDER: FailureCategory[] = [
  "maths_error",
  "ambiguous_wording",
  "bad_distractors",
  "json_shape_error",
  "copy_style",
  "duplicate",
];

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function categoriesFromText(blob: string): FailureCategory[] {
  const found = new Set<FailureCategory>();
  if (
    matchAny(blob, [
      /solver got/i,
      /does not match/i,
      /calculation/i,
      /incorrect answer/i,
      /wrong answer/i,
      /computedanswer/i,
      /canonical/i,
      /explanation implies/i,
      /numeric answer/i,
      /option \w+ is \d+/i,
    ])
  ) {
    found.add("maths_error");
  }
  if (
    matchAny(blob, [
      /ambiguous/i,
      /must-be-true/i,
      /must be true/i,
      /not auto-verified/i,
      /human review required/i,
      /multiple correct/i,
      /unclear stem/i,
    ])
  ) {
    found.add("ambiguous_wording");
  }
  if (
    matchAny(blob, [
      /distractor/i,
      /weak trap/i,
      /trap:/i,
      /wrong method/i,
      /arbitrary/i,
    ])
  ) {
    found.add("bad_distractors");
  }
  if (
    matchAny(blob, [
      /missing /i,
      /invalid /i,
      /mapping:/i,
      /json/i,
      /schema/i,
      /need(s)? exactly/i,
      /duplicate legacy_id/i,
      /requiresvisual/i,
    ])
  ) {
    found.add("json_shape_error");
  }
  if (
    matchAny(blob, [
      /^copy:/i,
      /uk spelling/i,
      /em dash/i,
      /en dash/i,
      /ai\//i,
      /chatbot/i,
      /tutorial voice/i,
      /us spelling/i,
      /exclamation/i,
      /slow region algebra/i,
      /fast method/i,
      /§4A/i,
    ])
  ) {
    found.add("copy_style");
  }
  if (matchAny(blob, [/near-duplicate/i, /duplicate option/i, /duplicate stem/i])) {
    found.add("duplicate");
  }
  return CATEGORY_ORDER.filter((c) => found.has(c));
}

export function classifyFailures(input: {
  layer1Hard: string[];
  layer1Soft: string[];
  layer2: PluginVerifyResult | null;
  layer3: AuditVerdict | null;
  mappingError?: string;
}): FailureCategory[] {
  const parts: string[] = [
    ...input.layer1Hard,
    ...input.layer1Soft,
    input.layer2?.summary ?? "",
    ...(input.layer3?.issues ?? []),
    input.mappingError ?? "",
  ];
  const scores = input.layer3?.scores;
  if (scores && !scores.mathsCorrect) parts.push("maths_error audit");
  if (scores && !scores.oneCorrectAnswer) parts.push("ambiguous oneCorrectAnswer");
  if (scores && !scores.explanationMatches) parts.push("explanation mismatch");
  if (scores && !scores.ucatStyle) parts.push("copy_style audit");
  return categoriesFromText(parts.join(" "));
}

export function formatFailureCategories(cats: FailureCategory[]): string {
  return cats.length ? cats.join(", ") : "none";
}
