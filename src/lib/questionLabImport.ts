import type { QLDifficulty, QLQuestionKind, QLSection } from "../types/questionLab";
import type { DmTrainerOptionId } from "../types/dmTrainers";
import { TRAINER_META, type TrainerMeta } from "./questionLabAssets";
import { supabase } from "./supabase";

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

export type ImportPreviewItem = {
  legacy_id: string;
  skill_tag: string;
  difficulty: string;
  stemPreview: string;
};

export type ImportParseResult =
  | { ok: true; items: ImportDraftPayload[]; preview: ImportPreviewItem[] }
  | { ok: false; message: string; details?: string[] };

const OPTION_IDS: DmTrainerOptionId[] = ["A", "B", "C", "D"];

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseJsonInput(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence) text = fence[1].trim();
  return JSON.parse(text) as unknown;
}

function normalizeDifficulty(v: unknown, fallback: QLDifficulty = "medium"): QLDifficulty {
  const d = str(v).toLowerCase();
  if (d === "easy" || d === "foundation") return "easy";
  if (d === "hard" || d === "challenging") return "hard";
  if (d === "medium" || d === "standard") return "medium";
  return fallback;
}

function optionsFromRaw(raw: unknown): Record<DmTrainerOptionId, string> | null {
  if (Array.isArray(raw)) {
    const record = {} as Record<DmTrainerOptionId, string>;
    for (const item of raw) {
      const row = asRecord(item);
      if (!row) continue;
      const id = str(row.id).toUpperCase() as DmTrainerOptionId;
      const text = str(row.text);
      if (OPTION_IDS.includes(id) && text) record[id] = text;
    }
    return OPTION_IDS.every((id) => record[id]) ? record : null;
  }
  const rec = asRecord(raw);
  if (!rec) return null;
  const record = {} as Record<DmTrainerOptionId, string>;
  for (const id of OPTION_IDS) {
    const text = str(rec[id]);
    if (text) record[id] = text;
  }
  return OPTION_IDS.every((id) => record[id]) ? record : null;
}

function mapDmMcq(raw: Record<string, unknown>, meta: TrainerMeta): ImportDraftPayload | string {
  const legacy_id = str(raw.legacy_id) || str(raw.id);
  if (!legacy_id) return "Missing id or legacy_id";

  const stem = str(raw.stem);
  const question = str(raw.question) || str(raw.content && asRecord(raw.content)?.question);
  const explanation = str(raw.explanation);
  const skill_tag = str(raw.skill_tag) || str(raw.skillTag);
  if (!stem || !question || !explanation || !skill_tag) {
    return "DM question needs stem, question, explanation, and skill_tag";
  }

  const contentObj = asRecord(raw.content);
  const options =
    optionsFromRaw(raw.options) ??
    optionsFromRaw(contentObj?.options) ??
    null;
  if (!options) return "DM question needs four options (A–D)";

  const correctAnswer = (
    str(raw.correctAnswer) ||
    str(raw.correct_answer) ||
    str(contentObj?.correctAnswer)
  ).toUpperCase() as DmTrainerOptionId;
  if (!OPTION_IDS.includes(correctAnswer)) return "Invalid correctAnswer";

  const content: Record<string, unknown> = {
    question,
    options,
    correctAnswer,
    commonTrap: str(raw.commonTrap) || str(raw.common_trap) || str(contentObj?.commonTrap) || "unspecified-trap",
  };

  const working = raw.optionalWorkingSteps ?? raw.workingSteps ?? contentObj?.workingSteps;
  if (Array.isArray(working) && working.length) content.workingSteps = working;

  for (const key of ["generalRule", "wrongOptionReasons", "keyInsight", "review"] as const) {
    if (raw[key] != null) content[key] = raw[key];
    else if (contentObj?.[key] != null) content[key] = contentObj[key];
  }

  return {
    legacy_id,
    section: meta.section,
    trainer_type: meta.trainerType,
    question_kind: meta.questionKind,
    difficulty: normalizeDifficulty(raw.difficulty),
    skill_tag,
    stem,
    explanation,
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

  const content: Record<string, unknown> = {
    domain,
    items,
  };
  const pivot = str(raw.pivotInsight) || str(raw.pivot_insight) || str(asRecord(raw.content)?.pivotInsight);
  if (pivot) content.pivotInsight = pivot;

  const skill_tag = str(raw.skill_tag) || str(raw.skillTag) || domain;

  return {
    legacy_id,
    section: meta.section,
    trainer_type: meta.trainerType,
    question_kind: meta.questionKind,
    difficulty: normalizeDifficulty(raw.difficulty),
    skill_tag,
    stem,
    explanation: str(raw.explanation) || "See item rationales in content.",
    content,
  };
}

function mapConversion(raw: Record<string, unknown>, meta: TrainerMeta): ImportDraftPayload | string {
  const legacy_id = str(raw.legacy_id) || str(raw.id);
  if (!legacy_id) return "Missing id or legacy_id";

  const prompt = str(raw.prompt) || str(raw.stem) || str(raw.question);
  const answer = Number(raw.answer ?? raw.correctAnswer ?? asRecord(raw.content)?.correctAnswer);
  if (!prompt || Number.isNaN(answer)) return "Conversion needs prompt and numeric correctAnswer";

  const units = str(raw.answerLabel) || str(raw.units) || str(asRecord(raw.content)?.units) || "";
  const worked =
    str(raw.workedSolution) ||
    str(asRecord(raw.explanation)?.examShortcut) ||
    str(raw.explanation) ||
    "";

  return {
    legacy_id,
    section: meta.section,
    trainer_type: meta.trainerType,
    question_kind: meta.questionKind,
    difficulty: normalizeDifficulty(raw.difficulty),
    skill_tag: str(raw.skill_tag) || str(raw.category) || "conversion",
    stem: prompt,
    explanation: worked || `Answer: ${answer}${units ? ` ${units}` : ""}`,
    content: {
      question: prompt,
      correctAnswer: answer,
      units,
      workedSolution: worked,
      commonTrap: str(raw.commonTrap) || str(asRecord(raw.explanation)?.commonTrap) || "",
    },
  };
}

export function parseImportJson(raw: string, trainerType: string): ImportParseResult {
  const meta = TRAINER_META[trainerType];
  if (!meta) return { ok: false, message: "Unknown trainer type." };
  if (!meta.supportsImport) {
    return { ok: false, message: meta.importHint ?? "Import not supported for this trainer yet." };
  }

  let parsed: unknown;
  try {
    parsed = parseJsonInput(raw);
  } catch {
    return { ok: false, message: "Invalid JSON. Paste only the array from ChatGPT, or wrap in ```json```." };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : asRecord(parsed)?.questions;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, message: "Expected a JSON array of questions, or { \"questions\": [...] }." };
  }

  const items: ImportDraftPayload[] = [];
  const details: string[] = [];

  for (let i = 0; i < list.length; i++) {
    const row = asRecord(list[i]);
    if (!row) {
      details.push(`Row ${i + 1}: not an object`);
      continue;
    }

    let mapped: ImportDraftPayload | string;
    if (meta.section === "dm") mapped = mapDmMcq(row, meta);
    else if (meta.section === "sjt") mapped = mapSjt(row, meta);
    else if (meta.trainerType === "qr-conversions") mapped = mapConversion(row, meta);
    else mapped = `Row ${i + 1}: unsupported`;

    if (typeof mapped === "string") {
      details.push(`Row ${i + 1} (${str(row.id) || "?"}): ${mapped}`);
      continue;
    }
    items.push(mapped);
  }

  if (items.length === 0) {
    return { ok: false, message: "No valid questions found.", details };
  }

  return {
    ok: true,
    items,
    preview: items.map((q) => ({
      legacy_id: q.legacy_id,
      skill_tag: q.skill_tag,
      difficulty: q.difficulty,
      stemPreview: q.stem.slice(0, 80) + (q.stem.length > 80 ? "…" : ""),
    })),
  };
}

export type ImportRpcResult = {
  created: number;
  updated: number;
  skipped: Array<{ legacy_id: string; reason: string }>;
  errors: Array<{ index?: number; legacy_id?: string | null; message: string }>;
};

export async function importDraftsToDatabase(
  items: ImportDraftPayload[],
): Promise<ImportRpcResult> {
  const { data, error } = await supabase.rpc("admin_import_trainer_question_drafts", {
    p_questions: items,
  });
  if (error) throw error;
  return data as ImportRpcResult;
}
