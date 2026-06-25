import { supabase } from "./supabase";

/**
 * Admin overrides for flagged questions: a reversible soft-hide flag plus
 * field-level content edits, keyed by a normalised question identifier.
 *
 * Trainers call loadQuestionOverrides() (memoised, fail-open) and run their
 * questions through applyOverride() before showing them. The admin panel writes
 * via setQuestionHidden() / saveQuestionOverride(). See migration
 * 20260625120000_question_overrides.sql.
 */

export type QuestionOverrideRow = {
  question_identifier: string;
  question_kind: string | null;
  trainer_type: string | null;
  is_hidden: boolean;
  override: Record<string, unknown> | null;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type QuestionOverrideMap = Map<string, QuestionOverrideRow>;

const SELECT_COLS =
  "question_identifier, question_kind, trainer_type, is_hidden, override, note, updated_by, updated_at";

let cache: Promise<QuestionOverrideMap> | null = null;
/** Latest resolved overrides, for synchronous consumers (e.g. passage pickers). */
let snapshot: QuestionOverrideMap = new Map();

/**
 * Normalise a feedback identifier to the stable key used in question_overrides:
 *   sjt:<qid>:<itemId>        -> sjt:<qid>            (hide/edit at question level)
 *   distortion:<pid>:<index>  -> distortion-passage:<pid>  (generated items: hide passage)
 * Everything else is already question-stable and passes through unchanged.
 */
export function overrideKeyForIdentifier(identifier: string): string {
  const parts = identifier.split(":");
  if (parts[0] === "sjt" && parts.length >= 2) return `sjt:${parts[1]}`;
  if (parts[0] === "distortion" && parts.length >= 2) return `distortion-passage:${parts[1]}`;
  return identifier;
}

async function fetchOverrides(): Promise<QuestionOverrideMap> {
  try {
    const { data, error } = await supabase.from("question_overrides").select(SELECT_COLS);
    if (error) throw error;
    const map: QuestionOverrideMap = new Map();
    for (const row of (data ?? []) as QuestionOverrideRow[]) {
      map.set(row.question_identifier, row);
    }
    snapshot = map;
    return map;
  } catch {
    // Fail-open: a Supabase hiccup must never break a trainer.
    return new Map();
  }
}

/** Memoised load of all overrides. Fail-open (returns empty map on error). */
export function loadQuestionOverrides(): Promise<QuestionOverrideMap> {
  if (!cache) cache = fetchOverrides();
  return cache;
}

/** Drop the memoised cache so the next load re-fetches (call after admin writes). */
export function clearQuestionOverridesCache(): void {
  cache = null;
}

/**
 * Synchronous set of passage IDs hidden from the distortion (Speed Reading /
 * Rapid Recall) trainers, from the latest loaded snapshot. Empty until the
 * first load resolves (fail-open). Passage pickers run synchronously, so they
 * read this snapshot rather than awaiting.
 */
export function hiddenDistortionPassageIds(): Set<string> {
  const ids = new Set<string>();
  for (const [key, row] of snapshot) {
    if (row.is_hidden && key.startsWith("distortion-passage:")) {
      ids.add(key.slice("distortion-passage:".length));
    }
  }
  return ids;
}

// Kick off a load on import so the synchronous snapshot is populated soon after
// app start. Fail-open and memoised, so this is at most one cheap fetch.
void loadQuestionOverrides();

/** Look up the override row for a (possibly un-normalised) identifier. */
export function getOverrideFor(
  identifier: string,
  overrides: QuestionOverrideMap,
): QuestionOverrideRow | undefined {
  return overrides.get(overrideKeyForIdentifier(identifier));
}

/**
 * Apply an override to a question identified by `identifier`.
 * Returns null if the question is hidden; otherwise shallow-merges the override
 * fields on top of the question. `identifier` is normalised internally.
 */
export function applyOverride<T extends object>(
  identifier: string,
  question: T,
  overrides: QuestionOverrideMap,
): T | null {
  const row = overrides.get(overrideKeyForIdentifier(identifier));
  if (!row) return question;
  if (row.is_hidden) return null;
  if (row.override && typeof row.override === "object") {
    return { ...question, ...row.override } as T;
  }
  return question;
}

export function isPassageHiddenForDistortion(
  passageId: string,
  overrides: QuestionOverrideMap,
): boolean {
  return overrides.get(`distortion-passage:${passageId}`)?.is_hidden === true;
}

// ── Admin writes ────────────────────────────────────────────────────────────

type OverrideMeta = { questionKind?: string | null; trainerType?: string | null };

/** Soft-hide (or un-hide) a question. Preserves any existing content override. */
export async function setQuestionHidden(
  identifier: string,
  hidden: boolean,
  meta?: OverrideMeta,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("question_overrides").upsert(
    {
      question_identifier: overrideKeyForIdentifier(identifier),
      question_kind: meta?.questionKind ?? null,
      trainer_type: meta?.trainerType ?? null,
      is_hidden: hidden,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "question_identifier" },
  );
  clearQuestionOverridesCache();
  if (error) throw error;
}

/** Save a content override (the changed fields only). Preserves the hidden flag. */
export async function saveQuestionOverride(
  identifier: string,
  override: Record<string, unknown> | null,
  meta?: OverrideMeta,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("question_overrides").upsert(
    {
      question_identifier: overrideKeyForIdentifier(identifier),
      question_kind: meta?.questionKind ?? null,
      trainer_type: meta?.trainerType ?? null,
      override,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "question_identifier" },
  );
  clearQuestionOverridesCache();
  if (error) throw error;
}
