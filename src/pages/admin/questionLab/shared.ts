import { supabase } from "../../../lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuestionRow = {
  id: string;
  legacy_id: string | null;
  section: string;
  trainer_type: string;
  question_kind: string;
  status: "draft" | "active" | "archived";
  difficulty: "easy" | "medium" | "hard";
  skill_tag: string;
  stem: string;
  explanation: string;
  content: Record<string, unknown>;
  quality_status: string;
  quality_notes: string | null;
  is_flagged: boolean;
  flag_count: number;
  replaces_question_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GetQuestionsResult = { total: number; rows: QuestionRow[] };

export type CoverageRow = { trainer_type: string; total: number; active: number; draft: number; archived: number };
export type DiffRow    = { difficulty: string; total: number; active: number };
export type QualRow    = { quality_status: string; total: number };
export type StatRow    = { status: string; total: number };

export type Coverage = {
  by_trainer_type:   CoverageRow[];
  by_difficulty:     DiffRow[];
  by_quality_status: QualRow[];
  by_status:         StatRow[];
  flagged_count:     number;
};

export type Tab = "questions" | "queue" | "reports" | "coverage" | "csv";

export type ReportRow = {
  id: string;
  reason: string;
  notes: string | null;
  status: "open" | "reviewed" | "dismissed" | "fixed";
  created_at: string;
  reviewed_at: string | null;
  question_id: string;
  question_legacy_id: string | null;
  question_trainer_type: string;
  question_status: string;
  question_stem: string;
  question_flag_count: number;
};

export type GetReportsResult = { total: number; rows: ReportRow[] };
export type RpcArgs = Record<string, string | number | boolean | null>;

// ─── Constants ───────────────────────────────────────────────────────────────

export const TRAINER_TYPES = [
  "venn-logic",
  "data-logic",
  "argument-judge",
  "sjt-appropriateness",
  "sjt-importance",
  "sjt-ranking",
  "inference",
  "vr-passages",
  "qr-conversions",
];

export const SECTIONS = ["dm", "sjt", "vr", "qr"];
export const STATUSES = ["draft", "active", "archived"];
export const QUALITIES = ["unchecked", "pass", "needs_review", "fail"];
export const DIFFICULTIES = ["easy", "medium", "hard"];

export const STATUS_BADGE: Record<string, string> = {
  active:   "bg-black text-white",
  draft:    "bg-zinc-200 text-zinc-700",
  archived: "bg-zinc-100 text-zinc-400",
};

export const QUALITY_BADGE: Record<string, string> = {
  pass:         "bg-black text-white",
  unchecked:    "bg-zinc-200 text-zinc-600",
  needs_review: "bg-amber-100 text-amber-700 border border-amber-300",
  fail:         "bg-red-100 text-red-700 border border-red-300",
};

export const CSV_COLUMNS = [
  "id", "legacy_id", "section", "trainer_type", "question_kind",
  "status", "difficulty", "skill_tag", "stem", "explanation",
  "quality_status", "quality_notes", "is_flagged", "flag_count",
  "created_at",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCsv(rows: QuestionRow[], filename: string) {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((r) =>
    CSV_COLUMNS.map((col) => csvEscape(r[col as keyof QuestionRow])).join(",")
  );
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

const ADMIN_RPC_TIMEOUT_MS = 30_000;

export async function withAuthSessionRetry<T>(
  request: () => ReturnType<typeof supabase.rpc>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  let response = await request();
  if (response.error) {
    await supabase.auth.getSession().catch(() => null);
    response = await request();
  }
  return response as { data: T | null; error: { message: string } | null };
}

export async function withAdminRpcTimeout<T>(
  request: () => ReturnType<typeof supabase.rpc>,
  label: string,
): Promise<{ data: T | null; error: { message: string } | null }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out. Refresh the page and try again.`)),
      ADMIN_RPC_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([withAuthSessionRetry<T>(request), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withAdminActionTimeout<T>(action: () => Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out. Refresh the page and try again.`)),
      ADMIN_RPC_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([action(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function isActionLoading(actionLoading: string | null, action: string, id: string): boolean {
  return actionLoading === `${action}:${id}`;
}

export function trainerQuestionsArgs(input: {
  section?: string;
  trainerType?: string;
  status?: string;
  quality?: string;
  difficulty?: string;
  flagged?: boolean | null;
  search?: string;
  limit: number;
  offset: number;
}): RpcArgs {
  const args: RpcArgs = {
    p_section: input.section || null,
    p_trainer_type: input.trainerType || null,
    p_status: input.status || null,
    p_quality_status: input.quality || null,
    p_difficulty: input.difficulty || null,
    p_is_flagged: input.flagged ?? null,
    p_search: input.search?.trim() || null,
    p_limit: input.limit,
    p_offset: input.offset,
  };
  return args;
}
