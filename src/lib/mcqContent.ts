import type {
  ArgumentJudgeOptionLabel,
  ArgumentJudgeReview,
  DmTrainerOption,
  DmTrainerOptionId,
  DmTrainerReviewBase,
} from "../types/dmTrainers.ts";

export type McqOptionDetail = {
  id: DmTrainerOptionId;
  text: string;
  label?: ArgumentJudgeOptionLabel;
};

/** Canonical DM MCQ payload stored in trainer_questions.content */
export type McqContentPayload = {
  question: string;
  options: Record<DmTrainerOptionId, string>;
  optionsList: McqOptionDetail[];
  correctAnswer: DmTrainerOptionId;
  commonTrap: string;
  workingSteps?: string[];
  generalRule?: string;
  wrongOptionReasons?: Partial<Record<DmTrainerOptionId, string>>;
  keyInsight?: string;
  review?: DmTrainerReviewBase | ArgumentJudgeReview;
};

const OPTION_IDS: DmTrainerOptionId[] = ["A", "B", "C", "D"];

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const ARG_LABELS = new Set<string>([
  "directly-relevant",
  "partially-relevant",
  "true-but-irrelevant",
  "too-narrow",
  "unsupported-assumption",
  "overclaim",
  "vague",
  "does-not-answer-aim",
  "only-addresses-one-criterion",
]);

export function optionsListFromRaw(raw: unknown): McqOptionDetail[] | null {
  if (Array.isArray(raw)) {
    const list: McqOptionDetail[] = [];
    for (const item of raw) {
      const row = asRecord(item);
      if (!row) continue;
      const id = str(row.id).toUpperCase() as DmTrainerOptionId;
      const text = str(row.text);
      if (!OPTION_IDS.includes(id) || !text) continue;
      const detail: McqOptionDetail = { id, text };
      const label = str(row.label);
      if (label && ARG_LABELS.has(label)) {
        detail.label = label as ArgumentJudgeOptionLabel;
      }
      list.push(detail);
    }
    return OPTION_IDS.every((id) => list.some((o) => o.id === id)) ? list : null;
  }

  const rec = asRecord(raw);
  if (!rec) return null;
  const list: McqOptionDetail[] = [];
  for (const id of OPTION_IDS) {
    const text = str(rec[id]);
    if (text) list.push({ id, text });
  }
  return OPTION_IDS.every((id) => list.some((o) => o.id === id)) ? list : null;
}

export function optionsRecordFromList(list: McqOptionDetail[]): Record<DmTrainerOptionId, string> {
  const record = {} as Record<DmTrainerOptionId, string>;
  for (const opt of list) {
    record[opt.id] = opt.text;
  }
  return record;
}

export function dmOptionsFromList(list: McqOptionDetail[]): DmTrainerOption[] {
  return list.map((opt) => ({
    id: opt.id,
    text: opt.text,
    ...(opt.label ? { label: opt.label } : {}),
  }));
}

export function buildMcqContentFromParts(parts: {
  question: string;
  optionsList: McqOptionDetail[];
  correctAnswer: DmTrainerOptionId;
  commonTrap: string;
  workingSteps?: string[];
  generalRule?: string;
  wrongOptionReasons?: Partial<Record<DmTrainerOptionId, string>>;
  keyInsight?: string;
  review?: DmTrainerReviewBase | ArgumentJudgeReview;
}): McqContentPayload {
  return {
    question: parts.question,
    optionsList: parts.optionsList,
    options: optionsRecordFromList(parts.optionsList),
    correctAnswer: parts.correctAnswer,
    commonTrap: parts.commonTrap,
    workingSteps: parts.workingSteps,
    generalRule: parts.generalRule,
    wrongOptionReasons: parts.wrongOptionReasons,
    keyInsight: parts.keyInsight,
    review: parts.review,
  };
}

export function buildMcqContentFromImportRaw(
  raw: Record<string, unknown>,
  contentObj: Record<string, unknown> | null,
): { content: McqContentPayload } | { error: string } {
  const question = str(raw.question) || str(contentObj?.question);
  if (!question) return { error: "Missing question" };

  const optionsList =
    optionsListFromRaw(raw.options) ??
    optionsListFromRaw(contentObj?.optionsList) ??
    optionsListFromRaw(contentObj?.options);
  if (!optionsList) return { error: "Need four options (array with id/text or A–D record)" };

  const correctAnswer = (
    str(raw.correctAnswer) ||
    str(raw.correct_answer) ||
    str(contentObj?.correctAnswer)
  ).toUpperCase() as DmTrainerOptionId;
  if (!OPTION_IDS.includes(correctAnswer)) return { error: "Invalid correctAnswer" };

  const working = raw.optionalWorkingSteps ?? raw.workingSteps ?? contentObj?.workingSteps;
  const review = (raw.review ?? contentObj?.review) as
    | DmTrainerReviewBase
    | ArgumentJudgeReview
    | undefined;

  const content = buildMcqContentFromParts({
    question,
    optionsList,
    correctAnswer,
    commonTrap:
      str(raw.commonTrap) ||
      str(raw.common_trap) ||
      str(contentObj?.commonTrap) ||
      "unspecified-trap",
    workingSteps: Array.isArray(working) ? (working as string[]) : undefined,
    generalRule: str(raw.generalRule) || str(contentObj?.generalRule) || undefined,
    wrongOptionReasons:
      (raw.wrongOptionReasons as Partial<Record<DmTrainerOptionId, string>>) ??
      (contentObj?.wrongOptionReasons as Partial<Record<DmTrainerOptionId, string>>),
    keyInsight: str(raw.keyInsight) || str(contentObj?.keyInsight) || undefined,
    review,
  });

  return { content };
}
