/**
 * Recompute the intended numerical answer for calculator drill prompt text.
 * Used to audit generators and fuzzy-check that displayed answers stay consistent.
 *
 * Note: the on-screen UCAT-style calculator evaluates left-to-right without
 * precedence, so some multi-operation prompts need memory or an implicit plan.
 * The drill still expects the mathematically correct result from the prompt.
 */

export function answerFromCalculatorPrompt(text: string): number {
  const trimmed = text.trim();

  const pctOf = trimmed.match(/^(\d+)%\s*of\s+(\d+)$/);
  if (pctOf) {
    const pct = parseInt(pctOf[1], 10);
    const n = parseInt(pctOf[2], 10);
    return Math.round((pct / 100) * n);
  }

  const pairedProducts = trimmed.match(/^\((\d+)\s*×\s*(\d+)\)\s*\+\s*\((\d+)\s*×\s*(\d+)\)$/);
  if (pairedProducts) {
    const a = parseInt(pairedProducts[1], 10);
    const b = parseInt(pairedProducts[2], 10);
    const c = parseInt(pairedProducts[3], 10);
    const d = parseInt(pairedProducts[4], 10);
    return a * b + c * d;
  }

  const div = trimmed.match(/^(\d+)\s*÷\s*(\d+)$/);
  if (div) {
    const numerator = parseInt(div[1], 10);
    const denom = parseInt(div[2], 10);
    if (denom === 0) throw new Error(`Division by zero in prompt: ${text}`);
    return numerator / denom;
  }

  const bin = trimmed.match(/^(\d+)\s*([+\-×*])\s*(\d+)$/);
  if (bin) {
    const x = parseInt(bin[1], 10);
    const op = bin[2];
    const y = parseInt(bin[3], 10);
    if (op === "+") return x + y;
    if (op === "-") return x - y;
    if (op === "×" || op === "*") return x * y;
  }

  throw new Error(`Unsupported calculator prompt shape: ${text}`);
}
