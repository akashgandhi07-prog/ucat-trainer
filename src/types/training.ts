/**
 * Every value allowed in sessions.training_type. Keep in sync with the
 * sessions_training_type_check constraint (latest definition:
 * supabase/migrations/20260925160000_skill_trainer_session_types.sql).
 */
export const SESSION_TRAINING_TYPES = [
  "speed_reading",
  "rapid_recall",
  "keyword_scanning",
  "calculator",
  "inference_trainer",
  "mental_maths",
  "unit_conversions",
  "not_except",
  "qr_setup",
  "qr_data_extraction",
  "qr_estimation",
  "dm_constraints",
] as const;

export type TrainingType = (typeof SESSION_TRAINING_TYPES)[number];

export function isSessionTrainingType(value: unknown): value is TrainingType {
  return typeof value === "string" && (SESSION_TRAINING_TYPES as readonly string[]).includes(value);
}

/** Run-level summaries logged by the skill trainers that share SkillTrainerShell. */
export const SKILL_TRAINER_SESSION_TYPES = [
  "qr_setup",
  "qr_data_extraction",
  "qr_estimation",
  "dm_constraints",
] as const satisfies readonly TrainingType[];

export type SkillTrainerSessionType = (typeof SKILL_TRAINER_SESSION_TYPES)[number];

export function isSkillTrainerSessionType(value: unknown): value is SkillTrainerSessionType {
  return typeof value === "string" && (SKILL_TRAINER_SESSION_TYPES as readonly string[]).includes(value);
}

export type UcatSection = "vr" | "qr" | "dm";

/** Which UCAT section each sessions.training_type belongs to (dashboard tabs, counts). */
export const TRAINING_TYPE_SECTION: Record<TrainingType, UcatSection> = {
  speed_reading: "vr",
  rapid_recall: "vr",
  keyword_scanning: "vr",
  inference_trainer: "vr",
  not_except: "vr",
  calculator: "qr",
  mental_maths: "qr",
  unit_conversions: "qr",
  qr_setup: "qr",
  qr_data_extraction: "qr",
  qr_estimation: "qr",
  dm_constraints: "dm",
};

/** Trainer page for each training type (dashboard links). */
export const TRAINING_TYPE_PATHS: Record<TrainingType, string> = {
  speed_reading: "/ucat-verbal-reasoning-speed-reading-trainer",
  rapid_recall: "/ucat-rapid-recall-trainer",
  keyword_scanning: "/ucat-keyword-scanning-trainer",
  inference_trainer: "/ucat-inference-trainer",
  not_except: "/ucat-vr-not-except-trainer",
  calculator: "/ucat-calculator-trainer",
  mental_maths: "/ucat-mental-maths-trainer",
  unit_conversions: "/ucat-unit-conversions-trainer",
  qr_setup: "/ucat-qr-setup-trainer",
  qr_data_extraction: "/ucat-qr-data-extraction-trainer",
  qr_estimation: "/ucat-qr-estimation-trainer",
  dm_constraints: "/ucat-dm-constraint-builder",
};

export type TrainingDifficulty = "easy" | "medium" | "hard";

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  speed_reading: "Speed Reading",
  rapid_recall: "Rapid Recall",
  keyword_scanning: "Keyword Scanning",
  calculator: "Calculator Trainer",
  inference_trainer: "Inference Trainer",
  mental_maths: "Mental Maths Trainer",
  unit_conversions: "Conversions Trainer",
  not_except: "NOT/EXCEPT Trainer",
  qr_setup: "QR Setup Trainer",
  qr_data_extraction: "QR Data Extraction Trainer",
  qr_estimation: "QR Estimation Trainer",
  dm_constraints: "DM Constraint Builder",
};

export const TRAINING_DIFFICULTY_LABELS: Record<TrainingDifficulty, string> = {
  easy: "Easier",
  medium: "Standard",
  hard: "Challenging",
};
