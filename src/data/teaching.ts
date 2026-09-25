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
  calculator: {
    why: "UCAT's Decision Making and Quantitative Reasoning allow an on-screen calculator. Fluency with the numpad under time pressure saves seconds per question.",
    howToUse: [
      "Use the on-screen numpad or your keyboard to enter answers.",
      "Complete each calculation as quickly and accurately as you can.",
      "Review the heatmap to see which keys slow you down and practise them.",
    ],
  },
  inference_trainer: {
    why: "UCAT Verbal Reasoning tests making inferences and drawing conclusions. This trainer builds the skill of identifying the exact evidence that supports an inference.",
    howToUse: [
      "Read the passage and question.",
      "Select the relevant section(s) of text that answer the question.",
      "Submit your selection and review the explanation.",
    ],
  },
  mental_maths: {
    why: "UCAT Quantitative Reasoning benefits from quick mental calculation and estimation when the on-screen calculator is slow or unnecessary. This trainer builds automaticity and strategy so you can answer without relying on the calculator.",
    howToUse: [
      "Work through stages in order; each stage unlocks when you meet the accuracy and speed targets.",
      "Stages 1-2: use the number pad to enter exact answers.",
      "Stages 3-4: choose the best estimate from four multiple-choice options.",
      "Review your summary after each run to track progress.",
    ],
  },
  unit_conversions: {
    why: "UCAT Quantitative Reasoning often hides easy marks inside unit changes. This trainer builds the habit of setting up units before calculating.",
    howToUse: [
      "Read what unit the answer must be in before typing anything.",
      "Convert the given values first, then calculate.",
      "Use the explanation to check the shortcut, sense check and exact trap.",
    ],
  },
  not_except: {
    why: "UCAT Verbal Reasoning includes questions asking which statement is NOT supported by the passage. They take longer because every option needs checking, so a reliable method saves minutes.",
    howToUse: [
      "Read the passage once for structure.",
      "For each question, check every option against the text.",
      "Pick the one statement the passage does not support.",
    ],
  },
  qr_setup: {
    why: "Many UCAT Quantitative Reasoning marks are lost by solving the wrong problem accurately. This trainer practises the setup decisions before any calculation.",
    howToUse: [
      "Choose the information that matters and ignore the rest.",
      "Pick the operation, the answer unit and the exact calculator entry.",
      "Read the explanation for any decision you missed.",
    ],
  },
  qr_data_extraction: {
    why: "Table reading slips often look like maths errors. This trainer isolates finding the right cells, value and unit.",
    howToUse: [
      "Locate the cells the question needs.",
      "Work out the value those cells give.",
      "Confirm the unit from the headers before moving on.",
    ],
  },
  qr_estimation: {
    why: "Knowing when an estimate is enough saves time in UCAT Quantitative Reasoning without sacrificing accuracy.",
    howToUse: [
      "Choose the range the answer must fall in.",
      "Pick the fastest shortcut that is still reliable.",
      "Compare with the exact answer shown afterwards.",
    ],
  },
  dm_constraints: {
    why: "UCAT Decision Making arrangement puzzles reward managing several rules at once. Building the arrangement yourself trains that directly.",
    howToUse: [
      "Select an item, then choose a slot.",
      "Watch the rule checker as you place items.",
      "Check the arrangement once every slot is filled.",
    ],
  },
};
