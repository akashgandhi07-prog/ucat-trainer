import {
  SESSION_TRAINING_TYPES,
  TRAINING_TYPE_LABELS,
  isSessionTrainingType,
  type TrainingType,
} from "../../types/training";

/**
 * Per-trainer keys used by the admin RPCs: every sessions.training_type (from
 * src/types/training.ts) plus the three syllogism modes (foundation, micro,
 * macro), which live in syllogism_sessions rather than sessions.
 * syllogism_foundation was added by migration 20260926150000_admin_syllogism_foundation;
 * until that is applied the RPCs omit it and the client zero-fills it.
 */
export const SYLLOGISM_TRAINER_KEYS = ["syllogism_foundation", "syllogism_micro", "syllogism_macro"] as const;
export type SyllogismTrainerKey = (typeof SYLLOGISM_TRAINER_KEYS)[number];
export type AdminTrainerKey = TrainingType | SyllogismTrainerKey;
/** Per-mode syllogism session counts, one numeric field per mode. */
export type SyllogismCounts = Record<SyllogismTrainerKey, number>;

export const ADMIN_TRAINER_KEYS: readonly AdminTrainerKey[] = [...SESSION_TRAINING_TYPES, ...SYLLOGISM_TRAINER_KEYS];

const SYLLOGISM_LABELS: Record<SyllogismTrainerKey, string> = {
  syllogism_foundation: "Syllogism foundations",
  syllogism_micro: "Syllogism micro",
  syllogism_macro: "Syllogism macro",
};

/** Display label for a trainer key; unknown keys (e.g. a newly added type) fall back to a readable form. */
export function adminTrainerLabel(key: string): string {
  if (isSessionTrainingType(key)) return TRAINING_TYPE_LABELS[key];
  if (key in SYLLOGISM_LABELS) return SYLLOGISM_LABELS[key as SyllogismTrainerKey];
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Per-training_type session counts, one numeric field per type. */
export type SessionCounts = Record<TrainingType, number>;

type RowWithSessionCounts = { sessions_by_type?: Partial<Record<string, number>> | null };

/**
 * Session counts for every training type. Prefers the generic `sessions_by_type`
 * object (migration 20260926120000_admin_trainer_type_breakdown) and falls back to
 * the legacy flat keys (`<type>` or `sessions_<type>`) when the database has not
 * been migrated yet, so the page works whichever ships first.
 */
export function sessionCountsFrom(row: RowWithSessionCounts, legacyPrefix = ""): SessionCounts {
  const byType = row.sessions_by_type ?? null;
  const flat = row as Record<string, unknown>;
  const out = {} as SessionCounts;
  for (const t of SESSION_TRAINING_TYPES) {
    const fromBreakdown = byType?.[t];
    const legacy = flat[`${legacyPrefix}${t}`];
    out[t] = Number(fromBreakdown ?? (typeof legacy === "number" ? legacy : 0)) || 0;
  }
  return out;
}

type RowWithSyllogismCounts = Partial<Record<SyllogismTrainerKey, number | null>>;

/** Syllogism session counts per mode; a mode the server did not return (older RPC) counts as 0. */
export function syllogismCountsFrom(row: RowWithSyllogismCounts): SyllogismCounts {
  const out = {} as SyllogismCounts;
  for (const k of SYLLOGISM_TRAINER_KEYS) out[k] = Number(row[k] ?? 0) || 0;
  return out;
}

/** Returns the row with a numeric field for every trainer (for sortable columns and CSV). */
export function withSessionCounts<T extends RowWithSessionCounts & RowWithSyllogismCounts>(
  row: T
): T & SessionCounts & SyllogismCounts {
  return { ...row, ...sessionCountsFrom(row), ...syllogismCountsFrom(row) };
}

/** Session counts plus the syllogism modes, keyed by trainer. */
export function trainerSessionCounts(
  row: RowWithSessionCounts & RowWithSyllogismCounts
): Record<AdminTrainerKey, number> {
  return { ...sessionCountsFrom(row), ...syllogismCountsFrom(row) };
}

/** Trainer keys in canonical order, followed by any extra keys the server returned. */
export function orderedTrainerKeys(...sources: (Record<string, unknown> | null | undefined)[]): string[] {
  const keys: string[] = [...ADMIN_TRAINER_KEYS];
  for (const src of sources) {
    for (const k of Object.keys(src ?? {})) if (!keys.includes(k)) keys.push(k);
  }
  return keys;
}
