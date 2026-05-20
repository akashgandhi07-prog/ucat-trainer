import { hasForbiddenDash } from "../studentFacingCopy.ts";
import type { TrainerGenerateProfile } from "./types.ts";
import { asRecord, str } from "./utils.ts";

export type CopyQualityResult = {
  hard: string[];
  soft: string[];
};

/** US spellings left after auto-fix → soft flag (edit in Review Queue). */
const US_SPELLING_SOFT: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\borganiz(e|ed|es|ing)\b/i, message: "US spelling: use organise" },
  { pattern: /\borganization(s)?\b/i, message: "US spelling: use organisation" },
  { pattern: /\bcolor(s|ed|ing)?\b/i, message: "US spelling: use colour" },
  { pattern: /\bcenter(s|ed|ing)?\b/i, message: "US spelling: use centre" },
  { pattern: /\banalyz(e|ed|es|ing)\b/i, message: "US spelling: use analyse" },
  { pattern: /\bbehavior(s|al)?\b/i, message: "US spelling: use behaviour" },
  { pattern: /\bfavorite(s)?\b/i, message: "US spelling: use favourite" },
  { pattern: /\blabor\b/i, message: "US spelling: use labour" },
  { pattern: /\bdefense\b/i, message: "US spelling: use defence" },
  { pattern: /\butiliz(e|ed|es|ing)\b/i, message: "US wording: use plain 'use'" },
];

/** Hard fail: draft process leakage only (not fixable by auto-replace). */
const AI_LANGUAGE_HARD: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\blet me\b/i, message: "AI/meta voice: remove 'let me'" },
  { pattern: /\brecheck\b/i, message: "AI/meta voice: remove 'recheck'" },
  { pattern: /\bredesign\b/i, message: "AI/meta voice: remove 'redesign'" },
  { pattern: /\bnote:\s/i, message: "AI/meta voice: remove 'note:'" },
  { pattern: /\bthis question requires revision\b/i, message: "AI/meta voice" },
  { pattern: /\bas an ai\b/i, message: "AI/meta voice" },
  { pattern: /\bi(?:'d| would) be happy to\b/i, message: "AI chat voice" },
  { pattern: /\bhere(?:'s| is) (?:a |the )?(?:breakdown|summary)\b/i, message: "AI chat voice" },
];

/** Soft: import as needs_review so you can edit wording in Review Queue. */
const AI_LANGUAGE_SOFT: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bwait\b/i, message: "AI/meta voice: remove 'wait'" },
  { pattern: /\bactually\b/i, message: "Self-correction tone: remove 'actually'" },
  { pattern: /\bcertainly[!,]?\b/i, message: "AI chat voice: 'certainly'" },
  { pattern: /\bof course[!,]?\b/i, message: "AI chat voice: 'of course'" },
  { pattern: /\bgreat question\b/i, message: "AI chat voice" },
  { pattern: /\bin this (?:question|scenario),? we (?:will|can|need to)\b/i, message: "AI tutorial voice" },
  { pattern: /\bit'?s (?:important|worth|crucial|essential) to (?:note|remember|understand)\b/i, message: "AI filler phrasing" },
  { pattern: /\bdelve\b/i, message: "AI wording: avoid 'delve'" },
  { pattern: /\bleverage\b/i, message: "AI wording: avoid 'leverage'" },
  { pattern: /\brobust\b/i, message: "AI wording: avoid 'robust'" },
  { pattern: /\bcomprehensive\b/i, message: "AI wording: avoid 'comprehensive'" },
  { pattern: /\bnavigate\b/i, message: "AI metaphor: avoid 'navigate' (unless literal)" },
  { pattern: /\brest assured\b/i, message: "AI/chat wording" },
  { pattern: /\bfurthermore\b/i, message: "Over-formal connector: avoid 'furthermore'" },
  { pattern: /\bmoreover\b/i, message: "Over-formal connector: avoid 'moreover'" },
  { pattern: /\bin conclusion\b/i, message: "Essay voice: avoid 'in conclusion'" },
  { pattern: /\bto summarise\b/i, message: "Prefer direct teaching tone" },
];

const WORDING_SOFT: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bkeep in mind\b/i, message: "Chatty wording: prefer direct instruction" },
  { pattern: /\bremember that\b/i, message: "Chatty wording: prefer direct instruction" },
  { pattern: /\bdon't forget\b/i, message: "Chatty wording" },
  { pattern: /!/, message: "Avoid exclamation marks in student copy" },
  { pattern: /\bvery unique\b/i, message: "Awkward wording" },
  { pattern: /\bin order to\b/i, message: "Prefer plainer UK style: 'to'" },
  { pattern: /\bdue to the fact that\b/i, message: "Wordy: use 'because'" },
  { pattern: /\bat this point in time\b/i, message: "Wordy: use 'now'" },
];

function pushTextsFromRecord(
  out: Array<{ field: string; text: string }>,
  prefix: string,
  rec: Record<string, unknown>,
  keys: string[],
): void {
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) {
      out.push({ field: `${prefix}.${key}`, text: v.trim() });
    }
  }
}

/** Gather every student-facing string on a generated question object. */
export function collectStudentFacingTexts(
  raw: Record<string, unknown>,
  profile: TrainerGenerateProfile,
): Array<{ field: string; text: string }> {
  const out: Array<{ field: string; text: string }> = [];

  const add = (field: string, text: string) => {
    if (text.trim()) out.push({ field, text: text.trim() });
  };

  add("stem", str(raw.stem) || str(raw.prompt));
  add("question", str(raw.question));
  add("explanation", str(raw.explanation));
  add("generalRule", str(raw.generalRule));
  add("keyInsight", str(raw.keyInsight));
  add("pivotInsight", str(raw.pivotInsight));
  add("commonTrap", str(raw.commonTrap));

  const reasons = asRecord(raw.wrongOptionReasons);
  if (reasons) {
    for (const id of ["A", "B", "C", "D"]) {
      add(`wrongOptionReasons.${id}`, str(reasons[id]));
    }
  }

  const options = raw.options ?? asRecord(raw.content)?.options;
  if (Array.isArray(options)) {
    for (const row of options) {
      const rec = asRecord(row);
      const id = str(rec?.id);
      add(`options.${id || "?"}`, str(rec?.text));
    }
  } else {
    const rec = asRecord(options);
    if (rec) {
      for (const id of ["A", "B", "C", "D"]) {
        add(`options.${id}`, str(rec[id]));
      }
    }
  }

  const expObj = asRecord(raw.explanation);
  if (expObj) {
    pushTextsFromRecord(out, "explanation", expObj, [
      "examShortcut",
      "senseCheck",
      "commonTrap",
    ]);
    const method = asRecord(expObj.method);
    if (method) {
      pushTextsFromRecord(out, "explanation.method", method, [
        "target",
        "convert",
        "calculate",
      ]);
    }
  }

  if (Array.isArray(raw.items)) {
    for (let i = 0; i < raw.items.length; i++) {
      const rec = asRecord(raw.items[i]);
      if (!rec) continue;
      const prefix = `items[${i}]`;
      add(`${prefix}.text`, str(rec.text));
      add(`${prefix}.rationale`, str(rec.rationale));
      add(`${prefix}.whyNotAdjacent`, str(rec.whyNotAdjacent));
    }
  }

  if (profile.questionKind === "numeric") {
    add("prompt", str(raw.prompt));
    const worked = str(raw.workedSolution);
    if (worked) add("workedSolution", worked);
  }

  return out;
}

function checkText(field: string, text: string): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];

  if (hasForbiddenDash(text)) {
    hard.push(`${field}: em dash or en dash (use comma, colon, or ·)`);
  }

  for (const { pattern, message } of AI_LANGUAGE_HARD) {
    if (pattern.test(text)) hard.push(`${field}: ${message}`);
  }

  for (const { pattern, message } of US_SPELLING_SOFT) {
    if (pattern.test(text)) soft.push(`${field}: ${message}`);
  }

  for (const { pattern, message } of AI_LANGUAGE_SOFT) {
    if (pattern.test(text)) soft.push(`${field}: ${message}`);
  }

  for (const { pattern, message } of WORDING_SOFT) {
    if (pattern.test(text)) soft.push(`${field}: ${message}`);
  }

  if (/\s{2,}/.test(text)) {
    soft.push(`${field}: double spaces`);
  }

  if (text.length > 2_500) {
    soft.push(`${field}: very long (${text.length} chars); tighten for students under time pressure`);
  }

  return { hard, soft };
}

export function checkCopyQuality(
  raw: Record<string, unknown>,
  profile: TrainerGenerateProfile,
): CopyQualityResult {
  const hard: string[] = [];
  const soft: string[] = [];
  const seen = new Set<string>();

  for (const { field, text } of collectStudentFacingTexts(raw, profile)) {
    const key = `${field}:${text.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = checkText(field, text);
    hard.push(...result.hard);
    soft.push(...result.soft);
  }

  return { hard, soft };
}
