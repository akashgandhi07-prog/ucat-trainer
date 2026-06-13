import type { PluginVerifyResult } from "./types.ts";
import { parseOptionNumber, str } from "./utils.ts";

export type CanonicalSolution = {
  solutionFormula: string;
  computedAnswer: number | null;
  distractorLogic: string;
};

export function readCanonicalSolution(raw: Record<string, unknown>): CanonicalSolution | null {
  const formula = str(raw.solutionFormula) || str(raw.solution_formula);
  const distractorLogic = str(raw.distractorLogic) || str(raw.distractor_logic);
  const rawAnswer = raw.computedAnswer ?? raw.computed_answer;
  let computedAnswer: number | null = null;
  if (typeof rawAnswer === "number" && Number.isFinite(rawAnswer)) {
    computedAnswer = rawAnswer;
  } else {
    const parsed = parseOptionNumber(str(rawAnswer));
    if (parsed !== null) computedAnswer = parsed;
  }

  if (!formula && computedAnswer === null && !distractorLogic) return null;
  return { solutionFormula: formula, computedAnswer, distractorLogic };
}

/** Remove generator-only meta fields before student-facing import. */
export function stripGeneratorMetaFields(raw: Record<string, unknown>): void {
  for (const key of [
    "solutionFormula",
    "solution_formula",
    "computedAnswer",
    "computed_answer",
    "distractorLogic",
    "distractor_logic",
  ]) {
    delete raw[key];
  }
}

export function verifyCanonicalAgainstOption(
  raw: Record<string, unknown>,
  pluginComputed: number | null,
  correctOptionValue: number | null,
): PluginVerifyResult | null {
  const canonical = readCanonicalSolution(raw);
  if (!canonical || canonical.computedAnswer === null) return null;

  const claimed = canonical.computedAnswer;
  if (pluginComputed !== null && Math.abs(claimed - pluginComputed) > 0.5) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: `computedAnswer ${claimed} disagrees with plugin solver ${pluginComputed}.`,
      computedAnswer: pluginComputed,
    };
  }

  if (correctOptionValue !== null && Math.abs(claimed - correctOptionValue) > 0.5) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: `computedAnswer ${claimed} does not match keyed option value ${correctOptionValue}.`,
      computedAnswer: claimed,
    };
  }

  return {
    ok: true,
    hardFail: false,
    verified: true,
    reviewRecommended: false,
    summary: `Canonical computedAnswer ${claimed} matches keyed answer.`,
    computedAnswer: claimed,
  };
}
