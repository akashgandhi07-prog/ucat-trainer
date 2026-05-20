import type { PluginVerifyResult } from "../types.ts";
import { asRecord, extractIntegers, parseOptionNumber, str } from "../utils.ts";

const OPTION_IDS = ["A", "B", "C", "D"] as const;

function optionValues(raw: Record<string, unknown>): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  const options = raw.options ?? asRecord(raw.content)?.options;
  if (Array.isArray(options)) {
    for (const row of options) {
      const rec = asRecord(row);
      const id = str(rec?.id).toUpperCase();
      const text = str(rec?.text);
      if (id && text) {
        const n = parseOptionNumber(text);
        if (n !== null) out[id] = n;
      }
    }
    return out;
  }
  const rec = asRecord(options);
  if (rec) {
    for (const id of OPTION_IDS) {
      const n = parseOptionNumber(str(rec[id]));
      if (n !== null) out[id] = n;
    }
  }
  return out;
}

/** Classic two-set: total, |A|, |B|, neither given; find both = |A| + |B| + neither - total */
function tryTwoSetOverlap(stem: string): number | null {
  const nums = extractIntegers(stem);
  if (nums.length < 4) return null;
  const lower = stem.toLowerCase();
  if (!lower.includes("neither") && !lower.includes("none")) return null;

  const total = nums[0];
  const neither = nums[nums.length - 1];
  if (total <= 0 || neither < 0) return null;

  let setA = 0;
  let setB = 0;
  for (let i = 1; i < nums.length - 1; i++) {
    if (setA === 0) setA = nums[i];
    else if (setB === 0) setB = nums[i];
  }
  if (setA <= 0 || setB <= 0) return null;

  const both = setA + setB + neither - total;
  if (both < 0 || both > Math.min(setA, setB)) return null;
  return both;
}

export function verifySetLogic(raw: Record<string, unknown>): PluginVerifyResult {
  const skillTag = str(raw.skill_tag) || str(raw.skillTag);
  const stem = str(raw.stem);
  const correct = str(raw.correctAnswer).toUpperCase();
  const opts = optionValues(raw);

  if (skillTag.includes("must-be-true")) {
    return {
      ok: true,
      hardFail: false,
      verified: false,
      reviewRecommended: true,
      summary: "Must-be-true: no automated proof; human review required.",
    };
  }

  if (raw.requiresVisual === true) {
    return {
      ok: false,
      hardFail: true,
      verified: false,
      reviewRecommended: true,
      summary: "requiresVisual must be false for text-only Venn questions.",
    };
  }

  const computed = tryTwoSetOverlap(stem);
  if (computed === null) {
    return {
      ok: true,
      hardFail: false,
      verified: false,
      reviewRecommended: true,
      summary: "Set logic not auto-verified for this stem shape; human review.",
    };
  }

  const claimed = opts[correct];
  if (claimed === undefined) {
    return {
      ok: false,
      hardFail: true,
      verified: false,
      reviewRecommended: true,
      summary: `Could not parse numeric value for option ${correct}.`,
      computedAnswer: computed,
      correctOption: correct,
    };
  }

  if (Math.abs(claimed - computed) > 0.5) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: `Solver got ${computed} but option ${correct} is ${claimed}.`,
      computedAnswer: computed,
      correctOption: correct,
    };
  }

  return {
    ok: true,
    hardFail: false,
    verified: true,
    reviewRecommended: false,
    summary: `Two-set overlap verified: ${computed} matches option ${correct}.`,
    computedAnswer: computed,
    correctOption: correct,
  };
}
