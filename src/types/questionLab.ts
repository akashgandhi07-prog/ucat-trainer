// Types for the Question Lab system.
// TrainerQuestion matches the Supabase trainer_questions table exactly.
// Content shapes define what goes in the JSONB content column per trainer type.

// ─── Shared enums ────────────────────────────────────────────────────────────

export type QLSection = "vr" | "dm" | "qr" | "sjt";

export type QLTrainerType =
  | "venn-logic"
  | "data-logic"
  | "argument-judge"
  | "sjt-appropriateness"
  | "sjt-importance"
  | "sjt-ranking"
  | "inference"
  | "vr-passages"
  | "qr-conversions";

export type QLQuestionKind =
  | "mcq"            // DM, QR, VR inference
  | "appropriateness" // SJT rating
  | "importance"      // SJT importance
  | "ranking"         // SJT ranking
  | "numeric"         // QR numeric answer
  | "true-false-ct";  // VR true/false/cannot tell

export type QLStatus = "draft" | "active" | "archived";

export type QLDifficulty = "easy" | "medium" | "hard";

export type QLQualityStatus = "unchecked" | "pass" | "needs_review" | "fail";

export type QLOptionId = "A" | "B" | "C" | "D";

// ─── Content shapes (stored in trainer_questions.content JSONB) ───────────────

/** DM Venn Logic, Data Logic, Argument Judge, QR Conversions (MCQ), VR Inference */
export type McqContent = {
  question: string;
  options: Record<QLOptionId, string>;
  correctAnswer: QLOptionId;
  commonTrap: string;
  workingSteps?: string[];
};

/** QR Conversions — numeric answer variant */
export type NumericContent = {
  question: string;
  correctAnswer: number;
  tolerance?: number;   // acceptable margin, e.g. 0.01
  units: string;
  workedSolution: string;
};

/** SJT Appropriateness and Importance */
export type SjtRatingItem = {
  id: string;
  text: string;
  correctRating: "very_appropriate" | "appropriate" | "inappropriate" | "very_inappropriate"
    | "very_important" | "important" | "minor_importance" | "not_important";
  rationale: string;
  whyNotAdjacent: string;
};

export type SjtRatingContent = {
  domain: "knowledge_skills_development" | "patients_partnership_communication" | "colleagues_culture_safety" | "trust_professionalism";
  pivotInsight?: string;
  items: SjtRatingItem[];
};

/** SJT Ranking */
export type SjtRankingItem = {
  id: string;
  text: string;
  rank: 1 | 2 | 3;
  rationale: string;
};

export type SjtRankingContent = {
  domain: "knowledge_skills_development" | "patients_partnership_communication" | "colleagues_culture_safety" | "trust_professionalism";
  pivotInsight?: string;
  items: SjtRankingItem[];
};

/** VR Passages — full passage with multiple true/false/cannot tell questions */
export type TfctVerdict = "true" | "false" | "cannot_tell";

export type VrPassageQuestion = {
  id: string;
  statement: string;
  correctVerdict: TfctVerdict;
  explanation: string;
  evidenceQuote?: string; // the relevant passage sentence
};

export type VrPassageContent = {
  passageTitle: string;
  passageBody: string;
  topic: string;
  questions: VrPassageQuestion[];
};

/** Union of all content shapes */
export type QLContent =
  | McqContent
  | NumericContent
  | SjtRatingContent
  | SjtRankingContent
  | VrPassageContent;

// ─── Media attachment ─────────────────────────────────────────────────────────

export type QLMediaAttachment = {
  assetId: string;
  placement: "stem" | "question" | "option" | "explanation";
  alt: string;
};

// ─── Supabase row: trainer_questions ─────────────────────────────────────────

export type TrainerQuestion = {
  id: string;
  legacy_id: string | null;
  section: QLSection;
  trainer_type: QLTrainerType;
  question_kind: QLQuestionKind;
  status: QLStatus;
  difficulty: QLDifficulty;
  skill_tag: string;
  stem: string;
  explanation: string;
  content: QLContent;
  media: QLMediaAttachment[];
  quality_status: QLQualityStatus;
  quality_notes: string | null;
  last_reviewed_at: string | null;
  is_flagged: boolean;
  flag_count: number;
  replaces_question_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TrainerQuestionInsert = Omit<
  TrainerQuestion,
  "id" | "created_at" | "updated_at" | "is_flagged" | "flag_count"
> & {
  is_flagged?: boolean;
  flag_count?: number;
};

// Fields blocked from update while status = 'active'.
// Enforced by DB trigger; mirrored here so the UI can disable them.
export const ACTIVE_QUESTION_LOCKED_FIELDS = [
  "stem",
  "explanation",
  "content",
  "media",
  "difficulty",
  "skill_tag",
  "trainer_type",
  "question_kind",
] as const;

export type LockedField = (typeof ACTIVE_QUESTION_LOCKED_FIELDS)[number];

// ─── Supabase row: trainer_question_attempts ──────────────────────────────────
// Analytics stored per question attempt. Added from day one.

export type QuestionAttempt = {
  id: string;
  question_id: string;
  user_id: string | null;         // null for anonymous
  session_id: string | null;      // groups attempts within one trainer session
  trainer_type: QLTrainerType;
  skill_tag: string;
  difficulty: QLDifficulty;
  is_correct: boolean;
  selected_answer: string | null; // option id, verdict, rating, etc.
  changed_answer: boolean;        // true if user changed their answer before submitting
  time_taken_seconds: number;
  explanation_viewed: boolean;
  attempt_number: number;         // 1 = first attempt at this question
  created_at: string;
};

export type QuestionAttemptInsert = Omit<QuestionAttempt, "id" | "created_at">;

// ─── Supabase row: question_reports ──────────────────────────────────────────

export type QLReportReason =
  | "typo"
  | "ambiguous"
  | "wrong_answer"
  | "bad_explanation"
  | "technical_issue"
  | "other";

export type QLReportStatus = "open" | "reviewed" | "dismissed" | "fixed";

export type QuestionReport = {
  id: string;
  trainer_question_id: string;
  user_id: string | null;
  reason: QLReportReason;
  notes: string | null;
  status: QLReportStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type QuestionReportInsert = Omit<QuestionReport, "id" | "created_at" | "reviewed_by" | "reviewed_at" | "status">;

// ─── Supabase row: question_reviews ──────────────────────────────────────────

export type QLReviewType = "human" | "system";
export type QLReviewStatus = "pass" | "needs_review" | "fail";

export type ReviewFinding = {
  field: string;
  issue: string;
  suggestion?: string;
};

export type QuestionReview = {
  id: string;
  trainer_question_id: string;
  review_type: QLReviewType;
  status: QLReviewStatus;
  summary: string;
  findings: ReviewFinding[];
  suggested_revision: Partial<TrainerQuestionInsert> | null;
  created_by: string | null;
  created_at: string;
};

export type QuestionReviewInsert = Omit<QuestionReview, "id" | "created_at">;

// ─── Guards ───────────────────────────────────────────────────────────────────

export function isMcqContent(c: QLContent): c is McqContent {
  return "options" in c && "correctAnswer" in c && typeof (c as McqContent).correctAnswer === "string";
}

export function isNumericContent(c: QLContent): c is NumericContent {
  return "workedSolution" in c;
}

export function isSjtRatingContent(c: QLContent): c is SjtRatingContent {
  return "domain" in c && "items" in c && Array.isArray((c as SjtRatingContent).items) &&
    (c as SjtRatingContent).items.length > 0 && "correctRating" in (c as SjtRatingContent).items[0];
}

export function isSjtRankingContent(c: QLContent): c is SjtRankingContent {
  return "domain" in c && "items" in c && Array.isArray((c as SjtRankingContent).items) &&
    (c as SjtRankingContent).items.length > 0 && "rank" in (c as SjtRankingContent).items[0];
}

export function isVrPassageContent(c: QLContent): c is VrPassageContent {
  return "passageBody" in c;
}
