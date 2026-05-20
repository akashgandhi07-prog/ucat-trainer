export function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseAiJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  const parsed = JSON.parse(text) as unknown;
  if (Array.isArray(parsed)) return parsed;
  const rec = asRecord(parsed);
  if (rec && Array.isArray(rec.questions)) return rec.questions;
  throw new Error("Expected a JSON array of questions.");
}

export function normaliseStemKey(stem: string): string {
  return stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 120);
}

export function extractIntegers(text: string): number[] {
  const matches = text.match(/\d[\d,]*/g) ?? [];
  return matches.map((m) => Number(m.replace(/,/g, ""))).filter((n) => Number.isFinite(n));
}

export function parseOptionNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!cleaned) return null;
  const n = Number(cleaned[0]);
  return Number.isFinite(n) ? n : null;
}

const META_LEAK = [
  /\blet me\b/i,
  /\brecheck\b/i,
  /\bredesign\b/i,
  /\bnote:\s/i,
  /\bwait\b/i,
  /\bactually\b/i,
  /\bthis question requires revision\b/i,
];

export function hasMetaLeakage(text: string): boolean {
  return META_LEAK.some((re) => re.test(text));
}
