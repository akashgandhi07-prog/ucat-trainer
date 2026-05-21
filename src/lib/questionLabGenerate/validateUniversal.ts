import { checkCopyQuality } from "./copyQuality.ts";
import { findNearDuplicateStem } from "./stemSimilarity.ts";
import type { TrainerGenerateProfile } from "./types.ts";
import { asRecord, normaliseStemKey, str } from "./utils.ts";

const OPTION_IDS = ["A", "B", "C", "D"] as const;

const SJT_DOMAINS = new Set([
  "knowledge_skills_development",
  "patients_partnership_communication",
  "colleagues_culture_safety",
  "trust_professionalism",
]);

export type UniversalValidationResult = {
  hard: string[];
  soft: string[];
};

export function validateUniversal(
  raw: Record<string, unknown>,
  profile: TrainerGenerateProfile,
  existingStemKeys: Set<string>,
  legacyIdsInBatch?: Set<string>,
  bankStems: string[] = [],
): UniversalValidationResult {
  const issues: string[] = [];
  const legacyId = str(raw.legacy_id) || str(raw.id);
  if (!legacyId) issues.push("Missing id or legacy_id");
  else if (legacyIdsInBatch) {
    if (legacyIdsInBatch.has(legacyId)) issues.push(`Duplicate legacy_id in batch: ${legacyId}`);
    legacyIdsInBatch.add(legacyId);
  }

  if (raw.requiresVisual === true) {
    issues.push("requiresVisual must be false until diagram generation exists");
  }

  const stem = str(raw.stem) || str(raw.prompt);
  if (!stem) issues.push("Missing stem");

  let vennSlowExplanation: string | null = null;

  if (profile.questionKind === "mcq") {
    const explanation = str(raw.explanation);
    if (!explanation) issues.push("Missing explanation");
    else if (!/step\s*1\s*:/i.test(explanation)) {
      issues.push("Explanation should use Step 1:, Step 2:, … structure");
    }
    const skillTag = str(raw.skill_tag) || str(raw.skillTag);
    if (
      profile.trainerType === "venn-logic" &&
      skillTag === "two-set-find-overlap" &&
      explanation &&
      /\bneither\b/i.test(stem) &&
      (/\(\s*\d+\s*[-−]\s*Both\)/i.test(explanation) ||
        /Only\s+[A-Z].*\+\s*Only\s+[A-Z]/i.test(explanation) ||
        /governing equation/i.test(explanation))
    ) {
      vennSlowExplanation =
        "Explanation uses slow region algebra; rewrite with fast method (neither → at least one → add groups → subtract once)";
    }
    const generalRule = str(raw.generalRule);
    if (profile.trainerType === "venn-logic" && !generalRule) {
      issues.push("Missing generalRule (formula or procedure)");
    }
    const reasons = asRecord(raw.wrongOptionReasons);
    if (profile.trainerType === "venn-logic") {
      if (!reasons) issues.push("Missing wrongOptionReasons");
      else {
        for (const id of OPTION_IDS) {
          if (!str(reasons[id])) issues.push(`Missing wrongOptionReasons.${id}`);
        }
      }
    }
    if (!skillTag) issues.push("Missing skill_tag");
    const question = str(raw.question);
    if (!question) issues.push("Missing question line");

    const options = raw.options ?? asRecord(raw.content)?.options;
    const list = Array.isArray(options) ? options : null;
    const rec = asRecord(options);
    const texts: string[] = [];
    if (list) {
      for (const id of OPTION_IDS) {
        const row = list.find(
          (o) => str(asRecord(o)?.id).toUpperCase() === id,
        );
        const text = str(asRecord(row)?.text);
        if (!text) issues.push(`Missing option ${id}`);
        else texts.push(text);
      }
    } else if (rec) {
      for (const id of OPTION_IDS) {
        const text = str(rec[id]);
        if (!text) issues.push(`Missing option ${id}`);
        else texts.push(text);
      }
    } else {
      issues.push("Missing options");
    }
    if (texts.length === 4 && new Set(texts).size < 4) {
      issues.push("Duplicate option text");
    }

    const correct = str(raw.correctAnswer).toUpperCase();
    if (!OPTION_IDS.includes(correct as (typeof OPTION_IDS)[number])) {
      issues.push("Invalid correctAnswer");
    }
  }

  if (
    profile.questionKind === "appropriateness" ||
    profile.questionKind === "importance"
  ) {
    const domain = str(raw.domain);
    if (!domain) issues.push("Missing domain");
    else if (!SJT_DOMAINS.has(domain)) issues.push(`Invalid domain: ${domain}`);
    const items = raw.items;
    if (!Array.isArray(items) || items.length !== 4) {
      issues.push("Appropriateness/importance needs exactly 4 items");
    }
  }

  if (profile.questionKind === "ranking") {
    const domain = str(raw.domain);
    if (!domain) issues.push("Missing domain");
    else if (!SJT_DOMAINS.has(domain)) issues.push(`Invalid domain: ${domain}`);
    const items = raw.items;
    if (!Array.isArray(items) || items.length !== 3) {
      issues.push("Ranking needs exactly 3 items");
    }
  }

  if (profile.questionKind === "numeric") {
    const answer = Number(raw.answer ?? raw.correctAnswer);
    if (Number.isNaN(answer)) issues.push("Missing numeric answer");
    const prompt = str(raw.prompt) || stem;
    if (!prompt) issues.push("Missing prompt");
  }

  const copy = checkCopyQuality(raw, profile);
  for (const msg of copy.hard) issues.push(`Copy: ${msg}`);
  const soft = [...copy.soft];
  if (vennSlowExplanation) soft.push(vennSlowExplanation);

  if (stem) {
    const key = normaliseStemKey(stem);
    if (existingStemKeys.has(key)) {
      issues.push("Stem looks like a near-duplicate (exact key match)");
    } else {
      existingStemKeys.add(key);
      const near = findNearDuplicateStem(stem, bankStems);
      if (near) {
        issues.push(
          `Stem near-duplicate (${Math.round(near.score * 100)}% similar to bank stem)`,
        );
      }
    }
  }

  return { hard: issues, soft };
}
