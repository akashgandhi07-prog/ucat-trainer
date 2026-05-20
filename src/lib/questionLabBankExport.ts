import type { DmTrainerOptionId, DmTrainerQuestion, DmTrainerType } from "../types/dmTrainers";
import { getLocalDmTrainerQuestions } from "../data/dmTrainers/localQuestions";
import { CONVERSION_QUESTIONS } from "../data/conversionQuestions";
import type { BankExportRow } from "./questionLabAssets";
import { TRAINER_META } from "./questionLabAssets";
import { supabase } from "./supabase";

type DbRow = BankExportRow;

const DM_TYPES = new Set<DmTrainerType>(["venn-logic", "data-logic", "argument-judge"]);

function isDmTrainer(trainerType: string): trainerType is DmTrainerType {
  return DM_TYPES.has(trainerType as DmTrainerType);
}

function toOptionsRecord(
  options: DmTrainerQuestion["options"],
): Record<DmTrainerOptionId, string> {
  const record = {} as Record<DmTrainerOptionId, string>;
  for (const opt of options) {
    record[opt.id] = opt.text;
  }
  return record;
}

function dmToExportRow(q: DmTrainerQuestion, status = "local-files"): BankExportRow {
  const content: Record<string, unknown> = {
    question: q.question,
    options: toOptionsRecord(q.options),
    correctAnswer: q.correctAnswer,
    commonTrap: q.commonTrap,
    workingSteps: q.optionalWorkingSteps,
  };
  if (q.generalRule) content.generalRule = q.generalRule;
  if (q.wrongOptionReasons) content.wrongOptionReasons = q.wrongOptionReasons;
  if (q.keyInsight) content.keyInsight = q.keyInsight;
  if (q.review) content.review = q.review;

  return {
    id: q.id,
    legacy_id: q.id,
    status,
    difficulty: q.difficulty,
    skill_tag: q.skillTag,
    stem: q.stem,
    explanation: q.explanation,
    content,
    quality_status: "unchecked",
    quality_notes: status === "local-files" ? "From local TS bank (not yet in database)." : null,
    _source: "local-files",
  };
}

function mergeDmRows(dbRows: DbRow[], trainerType: DmTrainerType): BankExportRow[] {
  const local = getLocalDmTrainerQuestions(trainerType);
  const byLegacy = new Map<string, BankExportRow>();

  for (const row of dbRows) {
    const key = row.legacy_id ?? row.id;
    const localQ = local.find((q) => q.id === key);
    if (localQ) {
      const enriched = dmToExportRow(localQ, row.status);
      byLegacy.set(key, {
        ...row,
        content: enriched.content,
        _source: "merged",
      });
    } else {
      byLegacy.set(key, { ...row, _source: "database" });
    }
  }

  for (const q of local) {
    if (!byLegacy.has(q.id)) {
      byLegacy.set(q.id, dmToExportRow(q, "local-files"));
    }
  }

  return [...byLegacy.values()];
}

function conversionToExportRow(q: (typeof CONVERSION_QUESTIONS)[number]): BankExportRow {
  const worked = [
    q.explanation.method?.target,
    q.explanation.method?.convert,
    q.explanation.method?.calculate,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: q.id,
    legacy_id: q.id,
    status: "local-files",
    difficulty: "medium",
    skill_tag: q.category,
    stem: q.prompt,
    explanation: q.explanation.examShortcut ?? worked,
    content: {
      question: q.prompt,
      correctAnswer: q.answer,
      units: q.answerLabel,
      workedSolution: worked,
      commonTrap: q.explanation.commonTrap,
      category: q.category,
    },
    quality_status: "unchecked",
    quality_notes: "From local conversions bank.",
    _source: "local-files",
  };
}

type SjtSeedRow = {
  id: string;
  type: string;
  domain?: string;
  difficulty?: string;
  stem?: string;
  pivot_insight?: string;
  pivotInsight?: string;
  items?: unknown[];
};

function mapSjtDifficulty(d?: string): string {
  if (d === "foundation") return "easy";
  if (d === "challenging") return "hard";
  return "medium";
}

function sjtSeedToExportRow(q: SjtSeedRow): BankExportRow {
  return {
    id: q.id,
    legacy_id: q.id,
    status: "local-files",
    difficulty: mapSjtDifficulty(q.difficulty),
    skill_tag: q.domain ?? "",
    stem: q.stem ?? "",
    explanation: "",
    content: {
      domain: q.domain,
      pivotInsight: q.pivotInsight ?? q.pivot_insight,
      items: q.items ?? [],
    },
    quality_status: "unchecked",
    quality_notes: "From SJT seed JSON.",
    _source: "local-files",
  };
}

let sjtSeedCache: SjtSeedRow[] | null = null;

async function loadSjtSeed(): Promise<SjtSeedRow[]> {
  if (sjtSeedCache) return sjtSeedCache;
  const mod = await import("../../supabase/seed/sjt_questions.json");
  sjtSeedCache = (mod.default ?? mod) as SjtSeedRow[];
  return sjtSeedCache;
}

async function fetchDbRows(
  trainerType: string,
  status: "" | "active" | "draft",
): Promise<DbRow[]> {
  const { data, error } = await supabase.rpc("admin_get_trainer_questions", {
    p_section: null,
    p_trainer_type: trainerType,
    p_status: status || null,
    p_quality_status: null,
    p_difficulty: null,
    p_flagged: null,
    p_search: null,
    p_limit: 500,
    p_offset: 0,
  });
  if (error) throw error;
  const result = data as { rows?: DbRow[] } | null;
  return result?.rows ?? [];
}

export type BankLoadResult = {
  rows: BankExportRow[];
  sourceLabel: string;
};

export async function loadTrainerBankForExport(
  trainerType: string,
  status: "" | "active" | "draft",
): Promise<BankLoadResult> {
  const meta = TRAINER_META[trainerType];
  let dbRows: DbRow[] = [];
  try {
    dbRows = await fetchDbRows(trainerType, status);
  } catch {
    dbRows = [];
  }

  const filterStatus = (rows: BankExportRow[]) =>
    status ? rows.filter((r) => r.status === status || r.status === "local-files") : rows;

  if (isDmTrainer(trainerType)) {
    const merged = mergeDmRows(dbRows, trainerType);
    const filtered = filterStatus(merged);
    const dbCount = dbRows.length;
    const localOnly = filtered.filter((r) => r._source === "local-files").length;
    const label =
      dbCount > 0
        ? localOnly > 0
          ? `Database (${dbCount}) plus ${localOnly} only in local files`
          : `Database (${dbCount}), enriched with local teaching fields`
        : `Local files only (${filtered.length})`;
    return { rows: filtered, sourceLabel: label };
  }

  if (trainerType === "qr-conversions") {
    if (dbRows.length > 0) {
      return {
        rows: filterStatus(dbRows.map((r) => ({ ...r, _source: "database" as const }))),
        sourceLabel: `Database (${dbRows.length})`,
      };
    }
    const local = CONVERSION_QUESTIONS.map(conversionToExportRow);
    return { rows: local, sourceLabel: `Local files (${local.length})` };
  }

  if (trainerType.startsWith("sjt-")) {
    const sjtType = trainerType.replace("sjt-", "") as "appropriateness" | "importance" | "ranking";
    if (dbRows.length > 0) {
      return {
        rows: filterStatus(dbRows.map((r) => ({ ...r, _source: "database" as const }))),
        sourceLabel: `Database (${dbRows.length})`,
      };
    }
    const seed = await loadSjtSeed();
    const local = seed
      .filter((q) => q.type === sjtType)
      .map((q) => sjtSeedToExportRow(q));
    return { rows: local, sourceLabel: `SJT seed file (${local.length})` };
  }

  if (dbRows.length > 0) {
    return {
      rows: dbRows,
      sourceLabel: `Database (${dbRows.length})`,
    };
  }

  return {
    rows: [],
    sourceLabel: meta?.supportsLocalBank
      ? "No questions found in database or local bank"
      : "No questions in database yet",
  };
}
