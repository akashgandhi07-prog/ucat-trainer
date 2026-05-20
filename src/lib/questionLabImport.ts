import type { QuestionExplanation } from "../components/mentalMaths/mathsAlgorithms";
import type { ConversionQuestionCategory } from "../data/conversionQuestions";
import type { QLDifficulty, QLQuestionKind, QLSection } from "../types/questionLab";
import { buildMcqContentFromImportRaw } from "./mcqContent";
import {
  sanitizeQuestionContent,
  sanitizeSjtItems,
  sanitizeStudentFacingCopy,
} from "./studentFacingCopy";
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
    difficulty: normalizeDifficulty(raw.difficulty),
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
    difficulty: normalizeDifficulty(raw.difficulty),
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
    difficulty: normalizeDifficulty(raw.difficulty),
    skill_tag: category,
    stem: sanitizeStudentFacingCopy(prompt),
    explanation: sanitizeStudentFacingCopy(
      explanation.examShortcut || worked || `Answer: ${answer}${units ? ` ${units}` : ""}`,
    ),
    content,
  };
}

export function parseImportJson(raw: string, trainerType: string): ImportParseResult {
  const meta = TRAINER_META[trainerType];
  if (!meta) return { ok: false, message: "Unknown trainer type." };
  if (!meta.supportsImport) {
    return { ok: false, message: meta.importHint ?? "Import not supported for this trainer yet." };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{") && !trimmed.startsWith("```")) {
    return {
      ok: false,
      message: "Paste must start with [ (JSON array). You may have copied only part of the file.",
    };
  }

  let parsed: unknown;
  try {
    parsed = parseJsonInput(trimmed);
  } catch {
    return {
      ok: false,
      message:
        "Invalid or incomplete JSON. Paste the full array from ChatGPT, including the opening [ and closing ].",
    };
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

export const IMPORT_BATCH_SIZE = 10;
const IMPORT_RPC_TIMEOUT_MS = 60_000;
const IMPORT_AUTH_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function normalizeRpcResult(raw: unknown): ImportRpcResult {
  const row = asRecord(raw);
  return {
    created: typeof row?.created === "number" ? row.created : 0,
    updated: typeof row?.updated === "number" ? row.updated : 0,
    skipped: Array.isArray(row?.skipped) ? (row.skipped as ImportRpcResult["skipped"]) : [],
    errors: Array.isArray(row?.errors) ? (row.errors as ImportRpcResult["errors"]) : [],
  };
}

function mergeRpcResults(a: ImportRpcResult, b: ImportRpcResult): ImportRpcResult {
  return {
    created: a.created + b.created,
    updated: a.updated + b.updated,
    skipped: [...a.skipped, ...b.skipped],
    errors: [...a.errors, ...b.errors],
  };
}

async function importDraftBatch(items: ImportDraftPayload[]): Promise<ImportRpcResult> {
  const { data, error } = await withTimeout(
    supabase.rpc("admin_import_trainer_question_drafts", { p_questions: items }),
    IMPORT_RPC_TIMEOUT_MS,
    `Import timed out (${items.length} questions in this batch). Refresh, use Preview, then try again.`,
  );
  if (error) {
    const msg = error.message ?? "Import failed";
    if (msg.includes("not found") || msg.includes("Could not find the function")) {
      throw new Error(
        `${msg} Apply the latest Supabase migration (admin_import_trainer_question_drafts).`,
      );
    }
    if (msg.includes("Forbidden") || msg.includes("admin only")) {
      throw new Error("You must be signed in as an admin to import.");
    }
    throw new Error(msg);
  }
  return normalizeRpcResult(data);
}

export async function importDraftsToDatabase(
  items: ImportDraftPayload[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportRpcResult> {
  const {
    data: { session },
  } = await withTimeout(
    supabase.auth.getSession(),
    IMPORT_AUTH_TIMEOUT_MS,
    "Sign-in check timed out. Refresh the page and try again while logged in as admin.",
  );
  if (!session) {
    throw new Error("You are not signed in. Log in as admin and try again.");
  }

  if (items.length === 0) {
    return { created: 0, updated: 0, skipped: [], errors: [] };
  }

  let combined: ImportRpcResult = { created: 0, updated: 0, skipped: [], errors: [] };
  const total = items.length;

  for (let i = 0; i < items.length; i += IMPORT_BATCH_SIZE) {
    const batch = items.slice(i, i + IMPORT_BATCH_SIZE);
    const batchResult = await importDraftBatch(batch);
    combined = mergeRpcResults(combined, batchResult);
    onProgress?.(Math.min(i + batch.length, total), total);
  }

  return combined;
}
