import type { QuestionFeedbackContext } from "../components/feedback/QuestionFeedbackModal";
import type { DmTrainerType } from "../types/dmTrainers";
import type { QuestionFeedbackKind } from "./questionFeedback";

const KIND_BY_TRAINER: Record<DmTrainerType, QuestionFeedbackKind> = {
  "venn-logic": "dm_venn_logic",
  "data-logic": "dm_data_logic",
  "argument-judge": "dm_argument_judge",
};

export function getDmTrainerFeedbackContext(
  trainerType: DmTrainerType,
  questionId: string,
  analyticsType: string,
): QuestionFeedbackContext {
  return {
    trainerType: analyticsType as QuestionFeedbackContext["trainerType"],
    questionKind: KIND_BY_TRAINER[trainerType],
    questionIdentifier: `dm_trainer:${questionId}`,
    passageId: null,
    sessionId: null,
  };
}
