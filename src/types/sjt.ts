export type GMCDomainId =
  | "knowledge_skills_development"
  | "patients_partnership_communication"
  | "colleagues_culture_safety"
  | "trust_professionalism";

export type SJTQuestionType = "appropriateness" | "importance" | "ranking";

export type AppropriatenessRating =
  | "very_appropriate"
  | "appropriate"
  | "inappropriate"
  | "very_inappropriate";

export type ImportanceRating =
  | "very_important"
  | "important"
  | "minor_importance"
  | "not_important";

export type SJTRating = AppropriatenessRating | ImportanceRating;

export const APPROPRIATENESS_RATINGS: AppropriatenessRating[] = [
  "very_appropriate",
  "appropriate",
  "inappropriate",
  "very_inappropriate",
];

export const IMPORTANCE_RATINGS: ImportanceRating[] = [
  "very_important",
  "important",
  "minor_importance",
  "not_important",
];

export const APPROPRIATENESS_LABELS: Record<AppropriatenessRating, string> = {
  very_appropriate: "Very Appropriate",
  appropriate: "Appropriate",
  inappropriate: "Inappropriate",
  very_inappropriate: "Very Inappropriate",
};

export const IMPORTANCE_LABELS: Record<ImportanceRating, string> = {
  very_important: "Very Important",
  important: "Important",
  minor_importance: "Of Minor Importance",
  not_important: "Not Important at All",
};

export const APPROPRIATENESS_SHORT: Record<AppropriatenessRating, string> = {
  very_appropriate: "VA",
  appropriate: "A",
  inappropriate: "I",
  very_inappropriate: "VI",
};

export const IMPORTANCE_SHORT: Record<ImportanceRating, string> = {
  very_important: "VI",
  important: "I",
  minor_importance: "MI",
  not_important: "NI",
};

export type GmpReference = {
  label: string;
  url: string;
};

export type RatingItem = {
  id: string;
  text: string;
  correctRating: SJTRating;
  rationale: string;
  whyNotAdjacent: string;
  gmpRef?: GmpReference;
};

export type RankingItem = {
  id: string;
  text: string;
  rank: 1 | 2 | 3;
  rationale: string;
  gmpRef?: GmpReference;
};

export type SJTRatingQuestion = {
  id: string;
  type: "appropriateness" | "importance";
  stem: string;
  domain: GMCDomainId;
  difficulty: "foundation" | "standard" | "challenging";
  items: RatingItem[];
  pivotInsight?: string;
  gmpRef?: GmpReference;
};

export type SJTRankingQuestion = {
  id: string;
  type: "ranking";
  stem: string;
  domain: GMCDomainId;
  difficulty: "foundation" | "standard" | "challenging";
  items: RankingItem[];
  pivotInsight?: string;
  gmpRef?: GmpReference;
};

export type SJTQuestion = SJTRatingQuestion | SJTRankingQuestion;

export type SJTDifficulty = SJTQuestion["difficulty"];

export function isRatingQuestion(q: SJTQuestion): q is SJTRatingQuestion {
  return q.type === "appropriateness" || q.type === "importance";
}

export function isRankingQuestion(q: SJTQuestion): q is SJTRankingQuestion {
  return q.type === "ranking";
}

export function getRatingLabel(rating: SJTRating, type: "appropriateness" | "importance"): string {
  if (type === "appropriateness") {
    return APPROPRIATENESS_LABELS[rating as AppropriatenessRating];
  }
  return IMPORTANCE_LABELS[rating as ImportanceRating];
}

export function getRatingShort(rating: SJTRating, type: "appropriateness" | "importance"): string {
  if (type === "appropriateness") {
    return APPROPRIATENESS_SHORT[rating as AppropriatenessRating];
  }
  return IMPORTANCE_SHORT[rating as ImportanceRating];
}

export function getAdjacentRating(
  rating: SJTRating,
  type: "appropriateness" | "importance"
): SJTRating | null {
  const scale = type === "appropriateness" ? APPROPRIATENESS_RATINGS : IMPORTANCE_RATINGS;
  const idx = (scale as string[]).indexOf(rating);
  if (idx === -1) return null;
  if (idx === 0) return scale[1];
  return scale[idx - 1];
}

export type RatingAnswer = Record<string, SJTRating>;
export type RankingAnswer = { most: string | null; least: string | null };

/** Row from public.sjt_sessions (Supabase). */
export type SJTSessionsRow = {
  id: string;
  user_id: string;
  question_id: string;
  question_type: SJTQuestionType;
  domain: GMCDomainId;
  score: number;
  max_score: number;
  items_attempted: number;
  items_total: number;
  completed: boolean;
  created_at: string;
};

export type SJTSessionsInsert = Omit<SJTSessionsRow, "id" | "created_at">;

export type SJTSessionsPayload = Omit<SJTSessionsInsert, "user_id">;

export type SJTQuizProgress = {
  itemsAttempted: number;
  itemsTotal: number;
  partialScore: number;
};

export const SJT_QUESTION_TYPE_LABELS: Record<SJTQuestionType, string> = {
  appropriateness: "SJT · Appropriateness",
  importance: "SJT · Importance",
  ranking: "SJT · Ranking",
};
