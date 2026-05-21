import type { QLQuestionKind } from "../../types/questionLab";
import type { FailureCategory } from "./failureCategories.ts";

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
  verified: boolean;
  reviewRecommended: boolean;
  summary: string;
  computedAnswer?: string | number;
  correctOption?: string;
};

export type AuditScores = {
  mathsCorrect: boolean;
  oneCorrectAnswer: boolean;
  explanationMatches: boolean;
  ucatStyle: boolean;
};

export type AuditVerdict = {
  verdict: "pass" | "needs_review";
  issues: string[];
  accuracyPercent: number;
  scores: AuditScores;
};

export type QuestionVerifyOutcome = {
  legacyId: string;
  hardPass: boolean;
  qualityStatus: "pass" | "needs_review" | "fail";
  qualityNotes: string;
  failureCategories: FailureCategory[];
  layer1Issues: string[];
  layer2: PluginVerifyResult | null;
  layer3: AuditVerdict | null;
};

export type GeneratePhase = "generate" | "repair" | "verify" | "import";

export type RepairCandidateWire = {
  legacyId: string;
  raw: Record<string, unknown>;
};

export type RepairReasonSummary = {
  legacyId: string;
  qualityStatus: "pass" | "needs_review" | "fail";
  reasons: string;
  failureCategories?: FailureCategory[];
};

export type RepairResultSummary = {
  legacyId: string;
  beforeStatus: string;
  afterStatus: string;
  improved: boolean;
  accuracyPercent?: number;
  failureCategories?: FailureCategory[];
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
    audit_scores?: AuditScores;
    failure_categories?: FailureCategory[];
    audit_rationale?: string;
    imported?: boolean;
  }>;
  categorySummary?: Partial<Record<FailureCategory, number>>;
  hint?: string;
};
