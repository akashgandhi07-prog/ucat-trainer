import type { TrainerGenerateProfile, PluginVerifyResult } from "../types.ts";
import { verifyNumeric } from "./numeric.ts";
import { verifySetLogic } from "./setLogic.ts";
import { verifySjtStructure } from "./sjtStructure.ts";

export function runPlugins(
  raw: Record<string, unknown>,
  profile: TrainerGenerateProfile,
): PluginVerifyResult | null {
  if (profile.plugins.length === 0) return null;

  const results: PluginVerifyResult[] = [];
  for (const id of profile.plugins) {
    if (id === "set-logic") results.push(verifySetLogic(raw));
    else if (id === "numeric") results.push(verifyNumeric(raw, profile.trainerType));
    else if (id === "sjt-structure") {
      results.push(verifySjtStructure(raw, profile.questionKind));
    }
  }

  const hardFail = results.find((r) => r.hardFail && !r.ok);
  if (hardFail) return hardFail;

  const soft = results.find((r) => !r.ok);
  if (soft) return soft;

  const reviewRecommended = results.some((r) => r.reviewRecommended);
  const verified = results.every((r) => r.verified);

  return {
    ok: true,
    hardFail: false,
    verified,
    reviewRecommended,
    summary: results.map((r) => r.summary).join(" "),
    computedAnswer: results.find((r) => r.computedAnswer !== undefined)?.computedAnswer,
    correctOption: results.find((r) => r.correctOption)?.correctOption,
  };
}

/** Trainers with no deterministic plugin always need human review. */
export function pluginAbsentNeedsReview(profile: TrainerGenerateProfile): boolean {
  return profile.plugins.length === 0;
}

export function pluginContextLine(
  result: PluginVerifyResult | null,
  profile: TrainerGenerateProfile,
): string {
  if (pluginAbsentNeedsReview(profile)) {
    return "Plugin: none for this trainer; human review required.";
  }
  if (!result) return "Plugin: none.";
  return `Plugin (verified=${result.verified}): ${result.summary}`;
}
