import type { TrainingType } from "../types/training";

export type SkillTeaching = {
  why: string;
  howToUse: string[];
};

export const WHY_UCAT_READING =
  "UCAT tests reading speed and critical reasoning. These trainers help you build both under exam-like conditions.";

export const SKILL_TEACHING: Record<TrainingType, SkillTeaching> = {
  speed_reading: {
    why: "UCAT passages are long and timed. Speed reading builds fluency so you process text faster without losing comprehension.",
    howToUse: [
      "Set your target WPM (or use suggested).",
      "Read the passage; use Pause or Finish anytime.",
      "Answer True/False/Can't Tell questions.",
      "Rate the pace to refine your next session.",
    ],
  },
  rapid_recall: {
    why: "UCAT doesn't let you re-read. Rapid recall trains your memory under time pressure.",
    howToUse: [
      "Choose how long to read.",
      "Passage disappears when time's up.",
      "Answer from memory - no going back.",
    ],
  },
  keyword_scanning: {
    why: "Scanning for specific information quickly is essential in timed exams.",
    howToUse: [
      "See the target words.",
      "Find and click them in the passage as fast as you can.",
    ],
  },
};
