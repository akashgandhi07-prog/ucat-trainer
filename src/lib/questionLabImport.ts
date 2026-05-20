import { TRAINER_META } from "./questionLabAssets";
import {
  mapRawQuestionForImport,
  normalizeImportDifficulty,
  type ImportDraftPayload,
} from "./questionLabMapImport";
import { supabase } from "./supabase";

export type { ImportDraftPayload } from "./questionLabMapImport";

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

    const mapped = mapRawQuestionForImport(row, trainerType);
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

function asRecordRpc(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function normalizeRpcResult(raw: unknown): ImportRpcResult {
  const row = asRecordRpc(raw);
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

// Re-export for callers that need difficulty normalisation
export { normalizeImportDifficulty };
