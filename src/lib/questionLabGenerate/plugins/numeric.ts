import type { PluginVerifyResult } from "../types.ts";
import { asRecord, parseOptionNumber, str } from "../utils.ts";

function mcqCorrectValue(raw: Record<string, unknown>): number | null {
  const correct = str(raw.correctAnswer).toUpperCase();
  const options = raw.options ?? asRecord(raw.content)?.options;
  if (Array.isArray(options)) {
    const row = options.find((o) => str(asRecord(o)?.id).toUpperCase() === correct);
    return parseOptionNumber(str(asRecord(row)?.text));
  }
  const rec = asRecord(options);
  if (rec) return parseOptionNumber(str(rec[correct]));
  return null;
}

/** Pull a final numeric answer from explanation step 4 or last "= N" pattern */
function answerFromExplanation(explanation: string): number | null {
  const step4 = explanation.match(/step\s*4[^0-9]*(-?\d[\d,]*(?:\.\d+)?)/i);
  if (step4) return parseOptionNumber(step4[1]);
  const equals = [...explanation.matchAll(/=\s*(-?\d[\d,]*(?:\.\d+)?)/g)];
  if (equals.length) return parseOptionNumber(equals[equals.length - 1][1]);
  return null;
}

export function verifyNumeric(
  raw: Record<string, unknown>,
  trainerType: string,
): PluginVerifyResult {
  const unverified = (
    ok: boolean,
    hardFail: boolean,
    summary: string,
    extra?: Partial<PluginVerifyResult>,
  ): PluginVerifyResult => ({
    ok,
    hardFail,
    verified: false,
    reviewRecommended: true,
    summary,
    ...extra,
  });

  if (trainerType === "qr-conversions") {
    const answer = Number(raw.answer ?? raw.correctAnswer);
    if (Number.isNaN(answer)) {
      return unverified(false, true, "Missing numeric answer.");
    }
    const calc = str(asRecord(raw.explanation)?.method
      ? asRecord(asRecord(raw.explanation)?.method)?.calculate
      : "");
    const fromCalc = parseOptionNumber(calc);
    if (fromCalc !== null && Math.abs(fromCalc - answer) > 0.01) {
      return {
        ok: false,
        hardFail: true,
        verified: true,
        reviewRecommended: true,
        summary: `Answer ${answer} does not match worked calculation (${fromCalc}).`,
        computedAnswer: fromCalc,
      };
    }
    if (fromCalc === null) {
      return unverified(true, false, "No worked calculation to cross-check; human review.", {
        computedAnswer: answer,
      });
    }
    return {
      ok: true,
      hardFail: false,
      verified: true,
      reviewRecommended: false,
      summary: `Numeric answer ${answer} matches worked calculation.`,
      computedAnswer: answer,
    };
  }

  const claimed = mcqCorrectValue(raw);
  const explanation = str(raw.explanation);
  const inferred = answerFromExplanation(explanation);

  if (claimed === null) {
    return unverified(true, false, "Could not parse MCQ option values; human review.");
  }

  if (inferred === null) {
    return unverified(true, false, "No independent numeric recompute from explanation; human review.");
  }

  const tolerance = Math.max(0.5, Math.abs(inferred) * 0.02);
  if (Math.abs(claimed - inferred) > tolerance) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: `Explanation implies ${inferred} but correct option value is ${claimed}.`,
      computedAnswer: inferred,
      correctOption: str(raw.correctAnswer).toUpperCase(),
    };
  }

  return {
    ok: true,
    hardFail: false,
    verified: true,
    reviewRecommended: false,
    summary: `Numeric check: explanation answer ${inferred} matches option.`,
    computedAnswer: inferred,
    correctOption: str(raw.correctAnswer).toUpperCase(),
  };
}
