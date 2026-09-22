import type { DmTrainerType } from "../../types/dmTrainers";

// Separate from DM_TRAINER_CONFIGS so the Dashboard does not pull in the question banks.
export const DM_SKILLS_TRAINERS: { type: DmTrainerType; label: string; path: string }[] = [
  { type: "venn-logic", label: "Venn Logic", path: "/ucat-venn-logic-practice-questions" },
  { type: "data-logic", label: "Data Logic", path: "/ucat-data-logic-practice-questions" },
  { type: "argument-judge", label: "Argument Judge", path: "/ucat-argument-judge-practice-questions" },
];

export const DM_SKILLS_TRAINER_LABELS: Record<DmTrainerType, string> = {
  "venn-logic": "Venn Logic",
  "data-logic": "Data Logic",
  "argument-judge": "Argument Judge",
};
