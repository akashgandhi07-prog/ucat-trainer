/** Structural integrity only. Passing does not certify professional judgement. */
import type { SJTQuestion } from "../../src/types/sjt";

const domains = new Set(["knowledge_skills_development", "patients_partnership_communication", "colleagues_culture_safety", "trust_professionalism"]);
const ratings = {
  appropriateness: new Set(["very_appropriate", "appropriate", "inappropriate", "very_inappropriate"]),
  importance: new Set(["very_important", "important", "minor_importance", "not_important"]),
};
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function validateSjtQuestions(input: unknown, requireReferences = false): string[] {
  if (!Array.isArray(input) || input.length === 0) return ["Expected a non-empty question array"];
  const errors: string[] = [];
  const ids = new Set<string>();
  const itemIds = new Set<string>();
  const stems = new Set<string>();
  function reference(value: unknown, location: string) {
    const ref = record(value);
    try {
      if (!ref || !nonempty(ref.label) || !nonempty(ref.url)) throw new Error();
      const url = new URL(ref.url);
      if (url.protocol !== "https:" || url.hostname !== "www.gmc-uk.org") throw new Error();
    } catch { errors.push(`${location}: expected a labelled HTTPS GMC reference`); }
  }
  for (const [index, value] of input.entries()) {
    const q = record(value);
    if (!q) { errors.push(`Question ${index}: not an object`); continue; }
    const id = nonempty(q.id) ? q.id : `Question ${index}`;
    if (!nonempty(q.id) || ids.has(id)) errors.push(`${id}: missing or duplicate ID`);
    ids.add(id);
    if (!nonempty(q.stem)) errors.push(`${id}: missing stem`);
    else {
      const stem = normalise(q.stem);
      if (stems.has(stem)) errors.push(`${id}: duplicate scenario text`);
      stems.add(stem);
    }
    if (!nonempty(q.pivotInsight)) errors.push(`${id}: missing pivotInsight`);
    if (!domains.has(String(q.domain))) errors.push(`${id}: invalid domain`);
    if (!["foundation", "standard", "challenging"].includes(String(q.difficulty))) errors.push(`${id}: invalid editorial difficulty`);
    if (!["appropriateness", "importance", "ranking"].includes(String(q.type))) {
      errors.push(`${id}: invalid question type`); continue;
    }
    if (q.gmpRef !== undefined || requireReferences) reference(q.gmpRef, id);
    const items = q.items;
    if (!Array.isArray(items)) { errors.push(`${id}: missing items`); continue; }
    const expected = q.type === "ranking" ? 3 : 4;
    if (items.length !== expected) errors.push(`${id}: expected ${expected} items`);
    const texts = new Set<string>();
    const ranks: number[] = [];
    for (const [i, value] of items.entries()) {
      const item = record(value);
      if (!item) { errors.push(`${id} item ${i}: not an object`); continue; }
      const location = `${id} item ${String(item.id ?? i)}`;
      if (!nonempty(item.id) || itemIds.has(item.id)) errors.push(`${location}: missing or duplicate item ID`);
      if (nonempty(item.id)) itemIds.add(item.id);
      if (!nonempty(item.text)) errors.push(`${location}: missing text`);
      else {
        const text = normalise(item.text);
        if (texts.has(text)) errors.push(`${location}: duplicate option text`);
        texts.add(text);
      }
      if (!nonempty(item.rationale)) errors.push(`${location}: missing rationale`);
      if (q.type === "ranking") {
        if (typeof item.rank !== "number" || ![1, 2, 3].includes(item.rank)) errors.push(`${location}: invalid rank`);
        else ranks.push(item.rank);
      } else {
        if (!ratings[q.type as keyof typeof ratings].has(String(item.correctRating))) errors.push(`${location}: rating is invalid for this question type`);
        if (!nonempty(item.whyNotAdjacent)) errors.push(`${location}: missing adjacent-rating explanation`);
      }
      if (item.gmpRef !== undefined) reference(item.gmpRef, location);
      if (requireReferences && [item.text, item.rationale, item.whyNotAdjacent].some(v => typeof v === "string" && /[—–]/.test(v))) errors.push(`${location}: forbidden dash in new copy`);
    }
    if (q.type === "ranking" && ranks.sort().join(",") !== "1,2,3") errors.push(`${id}: ranks must be a unique 1, 2, 3`);
    if (requireReferences && [q.stem, q.pivotInsight].some(v => typeof v === "string" && /[—–]/.test(v))) errors.push(`${id}: forbidden dash in new copy`);
  }
  return errors;
}

export function assertValidSjtQuestions(input: unknown, requireReferences = false): asserts input is SJTQuestion[] {
  const errors = validateSjtQuestions(input, requireReferences);
  if (errors.length) throw new Error(errors.join("\n"));
}
