import {
  SESSION_TRAINING_TYPES,
  TRAINING_TYPE_LABELS,
  isSessionTrainingType,
  type TrainingType,
} from "../../types/training";

/**
 * Per-trainer keys used by the admin RPCs: every sessions.training_type (from
 * src/types/training.ts) plus the two syllogism modes, which live in
 * syllogism_sessions rather than sessions.
 */
export const SYLLOGISM_TRAINER_KEYS = ["syllogism_micro", "syllogism_macro"] as const;
export type SyllogismTrainerKey = (typeof SYLLOGISM_TRAINER_KEYS)[number];
export type AdminTrainerKey = TrainingType | SyllogismTrainerKey;

export const ADMIN_TRAINER_KEYS: readonly AdminTrainerKey[] = [...SESSION_TRAINING_TYPES, ...SYLLOGISM_TRAINER_KEYS];

const SYLLOGISM_LABELS: Record<SyllogismTrainerKey, string> = {
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

/** Returns the row with a numeric field for every training type (for sortable columns and CSV). */
export function withSessionCounts<T extends RowWithSessionCounts>(row: T): T & SessionCounts {
  return { ...row, ...sessionCountsFrom(row) };
}

/** Session counts plus the two syllogism modes, keyed by trainer. */
export function trainerSessionCounts(
  row: RowWithSessionCounts & { syllogism_micro?: number; syllogism_macro?: number }
): Record<AdminTrainerKey, number> {
  return {
    ...sessionCountsFrom(row),
    syllogism_micro: Number(row.syllogism_micro ?? 0),
    syllogism_macro: Number(row.syllogism_macro ?? 0),
  };
}

/** Trainer keys in canonical order, followed by any extra keys the server returned. */
export function orderedTrainerKeys(...sources: (Record<string, unknown> | null | undefined)[]): string[] {
  const keys: string[] = [...ADMIN_TRAINER_KEYS];
  for (const src of sources) {
    for (const k of Object.keys(src ?? {})) if (!keys.includes(k)) keys.push(k);
  }
  return keys;
}
