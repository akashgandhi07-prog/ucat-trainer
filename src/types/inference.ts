/** Character span within passage text (start inclusive, end exclusive). */
export type TextSpan = { start: number; end: number };

export type InferenceQuestion = {
  id: string;
  passageId: string;
  questionText: string;
  /** Primary correct span(s) - character offsets; accept if user overlaps any sufficiently */
  correctSpans: TextSpan[];
  /** Optional: alternate valid spans (e.g. longer context) */
  alternateSpans?: TextSpan[];
  /** 1-2 sentence explanation shown after answer */
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
};

export type InferenceAnswerResult = "correct" | "incorrect" | "partial" | "skipped";

export type InferenceBreakdownItem = {
  questionId: string;
  questionText: string;
  userSpan: TextSpan | null;
  userText: string;
  correctSpan: TextSpan;
  correctText: string;
  result: InferenceAnswerResult;
  explanation: string;
};
