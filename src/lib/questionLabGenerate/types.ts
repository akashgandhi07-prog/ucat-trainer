import type { QLQuestionKind } from "../../types/questionLab";

export type VerifyPluginId = "set-logic" | "numeric" | "sjt-structure";

export type TrainerGenerateProfile = {
  trainerType: string;
  slug: string;
  label: string;
  questionKind: QLQuestionKind;
  plugins: VerifyPluginId[];
  batchSize: number;
  requiresGoldExamples: boolean;
};

export type PluginVerifyResult = {
  ok: boolean;
  hardFail: boolean;
  /** True when a deterministic check confirmed the answer (not just "could not verify"). */
  verified: boolean;
  /** True when the question should land in Review Queue even if ok. */
  reviewRecommended: boolean;
  summary: string;
  computedAnswer?: string | number;
  correctOption?: string;
};

export type AuditVerdict = {
  verdict: "pass" | "needs_review";
  issues: string[];
  /** 0–100: exam-ready confidence. 100 only when fully correct with no known issues. */
  accuracyPercent: number;
};

export type QuestionVerifyOutcome = {
  legacyId: string;
  hardPass: boolean;
  qualityStatus: "pass" | "needs_review" | "fail";
  qualityNotes: string;
  layer1Issues: string[];
  layer2: PluginVerifyResult | null;
  layer3: AuditVerdict | null;
};

export type GeneratePhase = "generate" | "verify" | "repair" | "import";

export type RepairCandidateWire = {
  legacyId: string;
  raw: Record<string, unknown>;
};

export type RepairReasonSummary = {
  legacyId: string;
  qualityStatus: "pass" | "needs_review" | "fail";
  reasons: string;
};

export type RepairResultSummary = {
  legacyId: string;
  beforeStatus: string;
  afterStatus: string;
  improved: boolean;
  accuracyPercent?: number;
  reasons: string;
};

export type GenerateTrainerQuestionsResult = {
  created: number;
  updated: number;
  skipped: Array<{ legacy_id: string; reason: string }>;
  importErrors: Array<{ legacy_id?: string | null; message: string }>;
  generated: number;
  imported: number;
  failed: number;
  flagged: number;
  repairAttempted?: number;
  repairSucceeded?: number;
  questions: Array<{
    legacy_id: string;
    quality_status: string;
    quality_notes: string;
    accuracy_percent?: number;
    audit_rationale?: string;
    imported?: boolean;
  }>;
  hint?: string;
};
