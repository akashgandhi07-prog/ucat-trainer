import type { QuestionExplanation } from "../components/mentalMaths/mathsAlgorithms.ts";
import type { ConversionQuestionCategory } from "../data/conversionQuestions.ts";
import type { QLDifficulty, QLQuestionKind, QLSection } from "../types/questionLab.ts";
import { buildMcqContentFromImportRaw } from "./mcqContent.ts";
import {
  sanitizeQuestionContent,
  sanitizeSjtItems,
  sanitizeStudentFacingCopy,
} from "./studentFacingCopy.ts";
import { TRAINER_META, type TrainerMeta } from "./questionLabTrainerMeta.ts";

export type ImportDraftPayload = {
  legacy_id: string;
  section: QLSection;
  trainer_type: string;
  question_kind: QLQuestionKind;
  difficulty: QLDifficulty;
  skill_tag: string;
  stem: string;
  explanation: string;
  content: Record<string, unknown>;
  quality_status?: string;
  quality_notes?: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function normalizeImportDifficulty(
  v: unknown,
  fallback: QLDifficulty = "medium",
): QLDifficulty {
  const d = str(v).toLowerCase();
  if (d === "easy" || d === "foundation") return "easy";
  if (d === "hard" || d === "challenging") return "hard";
  if (d === "medium" || d === "standard") return "medium";
  return fallback;
}

function mapDmMcq(raw: Record<string, unknown>, meta: TrainerMeta): ImportDraftPayload | string {
  const legacy_id = str(raw.legacy_id) || str(raw.id);
  if (!legacy_id) return "Missing id or legacy_id";

  const stem = str(raw.stem);
  const explanation = str(raw.explanation);
  const skill_tag = str(raw.skill_tag) || str(raw.skillTag);
  if (!stem || !explanation || !skill_tag) {
    return "DM question needs stem, explanation, and skill_tag";
  }

  const built = buildMcqContentFromImportRaw(raw, asRecord(raw.content));
  if ("error" in built) return built.error;

  const content = sanitizeQuestionContent(
    built.content as unknown as Record<string, unknown>,
    meta.questionKind,
  );

  return {
    legacy_id,
    section: meta.section,
    trainer_type: meta.trainerType,
    question_kind: meta.questionKind,
    difficulty: normalizeImportDifficulty(raw.difficulty),
    skill_tag,
    stem: sanitizeStudentFacingCopy(stem),
    explanation: sanitizeStudentFacingCopy(explanation),
    content,
  };
}

function mapSjt(raw: Record<string, unknown>, meta: TrainerMeta): ImportDraftPayload | string {
  const legacy_id = str(raw.legacy_id) || str(raw.id);
  if (!legacy_id) return "Missing id or legacy_id";

  const stem = str(raw.stem);
  const domain = str(raw.domain) || str(asRecord(raw.content)?.domain);
  const items = raw.items ?? asRecord(raw.content)?.items;
  if (!stem || !domain || !Array.isArray(items) || items.length < 3) {
    return "SJT question needs stem, domain, and items array";
  }

  const sanitizedItems = sanitizeSjtItems(items) ?? items;
  const content: Record<string, unknown> = sanitizeQuestionContent(
    {
      domain,
      items: sanitizedItems,
      pivotInsight:
        str(raw.pivotInsight) ||
        str(raw.pivot_insight) ||
        str(asRecord(raw.content)?.pivotInsight) ||
        undefined,
    },
    meta.questionKind,
  );

  const skill_tag = str(raw.skill_tag) || str(raw.skillTag) || domain;

  return {
    legacy_id,
    section: meta.section,
    trainer_type: meta.trainerType,
    question_kind: meta.questionKind,
    difficulty: normalizeImportDifficulty(raw.difficulty),
    skill_tag,
    stem: sanitizeStudentFacingCopy(stem),
    explanation: sanitizeStudentFacingCopy(
      str(raw.explanation) || "See item rationales in content.",
    ),
    content,
  };
}

function parseConversionExplanation(raw: unknown): QuestionExplanation {
  const obj = asRecord(raw);
  if (obj && typeof obj.method === "object") {
    const method = asRecord(obj.method);
    return {
      method: {
        target: str(method?.target),
        convert: str(method?.convert),
        calculate: str(method?.calculate),
      },
      examShortcut: str(obj.examShortcut) || str(obj.exam_shortcut),
      senseCheck: str(obj.senseCheck) || str(obj.sense_check),
      commonTrap: str(obj.commonTrap) || str(obj.common_trap),
    };
  }
  const text = typeof raw === "string" ? raw.trim() : "";
  return {
    method: { target: "", convert: "", calculate: text },
    examShortcut: text,
    senseCheck: "",
    commonTrap: "",
  };
}

function mapConversion(raw: Record<string, unknown>, meta: TrainerMeta): ImportDraftPayload | string {
  const legacy_id = str(raw.legacy_id) || str(raw.id);
  if (!legacy_id) return "Missing id or legacy_id";

  const contentObj = asRecord(raw.content);
  const prompt =
    str(raw.prompt) || str(raw.stem) || str(raw.question) || str(contentObj?.question);
  const answer = Number(
    raw.answer ?? raw.correctAnswer ?? contentObj?.correctAnswer,
  );
  if (!prompt || Number.isNaN(answer)) return "Conversion needs prompt and numeric correctAnswer";

  const category = (str(raw.category) ||
    str(raw.skill_tag) ||
    str(raw.skillTag) ||
    str(contentObj?.category) ||
    "Metric length") as ConversionQuestionCategory;
  const units =
    str(raw.answerLabel) || str(raw.units) || str(contentObj?.units) || "";
  const explanation = parseConversionExplanation(raw.explanation ?? contentObj?.explanation);
  if (!explanation.commonTrap) {
    explanation.commonTrap =
      str(raw.commonTrap) || str(contentObj?.commonTrap) || "unspecified-trap";
  }
  const worked =
    str(raw.workedSolution) ||
    str(contentObj?.workedSolution) ||
    explanation.examShortcut;

  const content = sanitizeQuestionContent(
    {
      question: prompt,
      correctAnswer: answer,
      units,
      category,
      workedSolution: worked,
      commonTrap: explanation.commonTrap,
      explanation,
    },
    meta.questionKind,
  );

  return {
    legacy_id,
    section: meta.section,
    trainer_type: meta.trainerType,
    question_kind: meta.questionKind,
    difficulty: normalizeImportDifficulty(raw.difficulty),
    skill_tag: category,
    stem: sanitizeStudentFacingCopy(prompt),
    explanation: sanitizeStudentFacingCopy(
      explanation.examShortcut || worked || `Answer: ${answer}${units ? ` ${units}` : ""}`,
    ),
    content,
  };
}

/** Map one AI-generated question object to an import draft row. */
export function mapRawQuestionForImport(
  raw: Record<string, unknown>,
  trainerType: string,
): ImportDraftPayload | string {
  const meta = TRAINER_META[trainerType];
  if (!meta) return "Unknown trainer type.";
  if (!meta.supportsImport) {
    return meta.importHint ?? "Import not supported for this trainer.";
  }
  if (meta.section === "dm") return mapDmMcq(raw, meta);
  if (meta.section === "sjt") return mapSjt(raw, meta);
  if (meta.trainerType === "qr-conversions") return mapConversion(raw, meta);
  return "Unsupported trainer for import mapping.";
}
