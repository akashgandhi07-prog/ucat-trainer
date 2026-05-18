import type { DmTrainerQuestion, DmTrainerType } from "../../types/dmTrainers";
import { VENN_LOGIC_QUESTIONS } from "./vennLogicQuestions";
import { DATA_LOGIC_QUESTIONS } from "./dataLogicQuestions";
import { ARGUMENT_JUDGE_QUESTIONS } from "./argumentJudgeQuestions";

const LOCAL: Record<DmTrainerType, DmTrainerQuestion[]> = {
  "venn-logic": VENN_LOGIC_QUESTIONS,
  "data-logic": DATA_LOGIC_QUESTIONS,
  "argument-judge": ARGUMENT_JUDGE_QUESTIONS,
};

export function getLocalDmTrainerQuestions(trainerType: DmTrainerType): DmTrainerQuestion[] {
  return LOCAL[trainerType];
}

export function getAllLocalDmTrainerQuestions(): DmTrainerQuestion[] {
  return [...VENN_LOGIC_QUESTIONS, ...DATA_LOGIC_QUESTIONS, ...ARGUMENT_JUDGE_QUESTIONS];
}
