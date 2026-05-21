import { stripGeneratorMetaFields } from "./canonical.ts";
import { sanitizeStudentFacingCopy } from "../studentFacingCopy.ts";
import type { TrainerGenerateProfile } from "./types.ts";
import { asRecord, str } from "./utils.ts";
import { collectStudentFacingTexts } from "./copyQuality.ts";

/** Safe UK replacements (whole words only). */
const UK_WORD_FIXES: Array<{ pattern: RegExp; replace: string; label: string }> = [
  { pattern: /\borganize\b/gi, replace: "organise", label: "organize→organise" },
  { pattern: /\borganized\b/gi, replace: "organised", label: "organized→organised" },
  { pattern: /\borganizing\b/gi, replace: "organising", label: "organizing→organising" },
  { pattern: /\borganization\b/gi, replace: "organisation", label: "organization→organisation" },
  { pattern: /\borganizations\b/gi, replace: "organisations", label: "organizations→organisations" },
  { pattern: /\bcolor\b/gi, replace: "colour", label: "color→colour" },
  { pattern: /\bcolors\b/gi, replace: "colours", label: "colors→colours" },
  { pattern: /\bcolored\b/gi, replace: "coloured", label: "colored→coloured" },
  { pattern: /\bcenter\b/gi, replace: "centre", label: "center→centre" },
  { pattern: /\bcenters\b/gi, replace: "centres", label: "centers→centres" },
  { pattern: /\bcentered\b/gi, replace: "centred", label: "centered→centred" },
  { pattern: /\banalyze\b/gi, replace: "analyse", label: "analyze→analyse" },
  { pattern: /\banalyzed\b/gi, replace: "analysed", label: "analyzed→analysed" },
  { pattern: /\banalyzing\b/gi, replace: "analysing", label: "analyzing→analysing" },
  { pattern: /\bbehavior\b/gi, replace: "behaviour", label: "behavior→behaviour" },
  { pattern: /\bbehaviors\b/gi, replace: "behaviours", label: "behaviors→behaviours" },
  { pattern: /\bbehavioral\b/gi, replace: "behavioural", label: "behavioral→behavioural" },
  { pattern: /\bfavorite\b/gi, replace: "favourite", label: "favorite→favourite" },
  { pattern: /\bfavorites\b/gi, replace: "favourites", label: "favorites→favourites" },
  { pattern: /\blabor\b/gi, replace: "labour", label: "labor→labour" },
  { pattern: /\bdefense\b/gi, replace: "defence", label: "defense→defence" },
  { pattern: /\butilize\b/gi, replace: "use", label: "utilize→use" },
  { pattern: /\butilized\b/gi, replace: "used", label: "utilized→used" },
  { pattern: /\butilizes\b/gi, replace: "uses", label: "utilizes→uses" },
];

function fixString(text: string, fixes: string[]): string {
  let out = sanitizeStudentFacingCopy(text);
  for (const { pattern, replace, label } of UK_WORD_FIXES) {
    if (pattern.test(out)) {
      pattern.lastIndex = 0;
      out = out.replace(pattern, (m) => {
        if (m[0] === m[0].toUpperCase()) {
          return replace.charAt(0).toUpperCase() + replace.slice(1);
        }
        return replace;
      });
      fixes.push(label);
    }
    pattern.lastIndex = 0;
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function setByPath(raw: Record<string, unknown>, field: string, value: string): void {
  if (field === "stem") raw.stem = value;
  else if (field === "prompt") raw.prompt = value;
  else if (field === "question") raw.question = value;
  else if (field === "explanation" && typeof raw.explanation === "string") {
    raw.explanation = value;
  } else if (field === "generalRule") raw.generalRule = value;
  else if (field === "keyInsight") raw.keyInsight = value;
  else if (field === "pivotInsight") raw.pivotInsight = value;
  else if (field === "commonTrap") raw.commonTrap = value;
  else if (field.startsWith("wrongOptionReasons.")) {
    const id = field.split(".")[1];
    const reasons = asRecord(raw.wrongOptionReasons) ?? {};
    reasons[id] = value;
    raw.wrongOptionReasons = reasons;
  } else if (field.startsWith("options.")) {
    const id = field.split(".")[1];
    const options = raw.options;
    if (Array.isArray(options)) {
      for (const row of options) {
        const rec = asRecord(row);
        if (rec && str(rec.id).toUpperCase() === id.toUpperCase()) rec.text = value;
      }
    } else {
      const rec = asRecord(options) ?? {};
      rec[id] = value;
      raw.options = rec;
    }
  } else if (field.startsWith("items[")) {
    const m = field.match(/^items\[(\d+)\]\.(\w+)$/);
    if (m && Array.isArray(raw.items)) {
      const rec = asRecord(raw.items[Number(m[1])]);
      if (rec) rec[m[2]] = value;
    }
  }
}

/** Apply safe auto-fixes before validation (dashes, UK spellings, spacing). */
export function autoFixGeneratedRaw(
  raw: Record<string, unknown>,
  profile: TrainerGenerateProfile,
): { fixes: string[] } {
  const fixes: string[] = [];
  const texts = collectStudentFacingTexts(raw, profile);

  for (const { field, text } of texts) {
    const fixed = fixString(text, fixes);
    if (fixed !== text) setByPath(raw, field, fixed);
  }

  stripGeneratorMetaFields(raw);
  return { fixes: [...new Set(fixes)] };
}
