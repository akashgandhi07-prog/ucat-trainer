import type { PluginVerifyResult } from "../types.ts";
import { asRecord, str } from "../utils.ts";

const TFCT_ANSWERS = new Set(["True", "False", "Can't tell"]);
const QUESTION_TYPES = new Set(["tfct", "mc4"]);
const QUESTION_CATEGORIES = new Set(["standard", "author-opinion", "not-except"]);
const PASSAGE_WORDS_MIN = 260;
const PASSAGE_WORDS_MAX = 400;
const QUESTIONS_PER_PASSAGE = 4;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Deterministic structural checks for a generated VR passage set:
 * passage length in the 260-400 word UCAT band, exactly four questions, each
 * either T/F/Can't tell or a 4-option MC with one keyed answer, explanations
 * present, and no em or en dashes anywhere students will read.
 */
export function verifyVrStructure(raw: Record<string, unknown>): PluginVerifyResult {
  const issues: string[] = [];

  const passage = str(raw.passage) || str(asRecord(raw.content)?.passage);
  const title = str(raw.title) || str(asRecord(raw.content)?.title);
  if (!passage) {
    return {
      ok: false,
      hardFail: true,
      verified: true,
      reviewRecommended: true,
      summary: "Missing passage text.",
    };
  }
  if (!title) issues.push("Missing passage title");

  const words = wordCount(passage);
  if (words < PASSAGE_WORDS_MIN || words > PASSAGE_WORDS_MAX) {
    issues.push(`Passage is ${words} words; must be ${PASSAGE_WORDS_MIN}-${PASSAGE_WORDS_MAX}`);
  }

  const questions = (raw.questions ?? asRecord(raw.content)?.questions) as unknown;
  if (!Array.isArray(questions) || questions.length !== QUESTIONS_PER_PASSAGE) {
    issues.push(`Needs exactly ${QUESTIONS_PER_PASSAGE} questions`);
  } else {
    questions.forEach((q, i) => {
      const obj = asRecord(q);
      if (!obj) {
        issues.push(`Question ${i + 1} is not an object`);
        return;
      }
      const type = str(obj.type) || "tfct";
      if (!QUESTION_TYPES.has(type)) issues.push(`Question ${i + 1}: unknown type '${type}'`);
      const category = str(obj.questionCategory) || "standard";
      if (!QUESTION_CATEGORIES.has(category)) {
        issues.push(`Question ${i + 1}: unknown questionCategory '${category}'`);
      }
      if (!str(obj.explanation)) issues.push(`Question ${i + 1}: missing explanation`);

      if (type === "tfct") {
        if (!str(obj.statement)) issues.push(`Question ${i + 1}: tfct needs statement`);
        if (!TFCT_ANSWERS.has(str(obj.answer))) {
          issues.push(`Question ${i + 1}: answer must be True, False, or Can't tell`);
        }
      } else {
        if (!str(obj.stem)) issues.push(`Question ${i + 1}: mc4 needs stem`);
        const options = obj.options;
        if (!Array.isArray(options) || options.length !== 4 || options.some((o) => !str(o))) {
          issues.push(`Question ${i + 1}: mc4 needs exactly 4 non-empty options`);
        } else {
          const answer = str(obj.answer);
          if (!options.map((o) => str(o)).includes(answer)) {
            issues.push(`Question ${i + 1}: answer must exactly match one option`);
          }
        }
      }
    });
  }

  const everything = JSON.stringify(raw);
  if (/[–—]/.test(everything)) {
    issues.push("Contains an em dash or en dash; UK punctuation only");
  }

  if (issues.length > 0) {
    return {
      ok: false,
      hardFail: false,
      verified: true,
      reviewRecommended: true,
      summary: `VR structure issues: ${issues.join("; ")}.`,
    };
  }

  return {
    ok: true,
    hardFail: false,
    verified: true,
    reviewRecommended: false,
    summary: `VR structure OK (${words} words, ${QUESTIONS_PER_PASSAGE} questions).`,
  };
}
