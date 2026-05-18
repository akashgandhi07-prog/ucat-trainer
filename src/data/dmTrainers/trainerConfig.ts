import type { LucideIcon } from "lucide-react";
import { Circle, BarChart3, Scale } from "lucide-react";
import type { DmTrainerQuestion, DmTrainerType } from "../../types/dmTrainers";
import { getLocalDmTrainerQuestions } from "./localQuestions";

export type DmTrainerConfig = {
  type: DmTrainerType;
  title: string;
  hubDescription: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  icon: LucideIcon;
  skillSummary: string;
  introBullets: string[];
  questions: DmTrainerQuestion[];
  analyticsType: string;
};

export const DM_TRAINER_CONFIGS: Record<DmTrainerType, DmTrainerConfig> = {
  "venn-logic": {
    type: "venn-logic",
    title: "Venn Logic",
    hubDescription:
      "Build Venn diagrams from wording, avoid double counting, and master exactly, only, neither and must be true set logic.",
    seoTitle: "UCAT Venn diagram practice questions (Decision Making)",
    seoDescription:
      "Free UCAT Decision Making Venn diagram practice questions. Train set logic, exactly two, total mentions and must-be-true reasoning for UK applicants.",
    canonicalPath: "/ucat-venn-logic-practice-questions",
    icon: Circle,
    skillSummary:
      "Translate UCAT wording into set regions. The phrase tells you which region to use, not just the final number.",
    introBullets: [
      "Master exactly two, only, neither and must be true wording.",
      "Use total-mentions logic for three-set diagrams without double counting.",
      "Five reviewed questions per drill. More batches are added after manual review.",
    ],
    questions: getLocalDmTrainerQuestions("venn-logic"),
    analyticsType: "dm_venn_logic",
  },
  "data-logic": {
    type: "data-logic",
    title: "Data Logic",
    hubDescription:
      "Train the percentage, probability and comparison logic behind UCAT Decision Making data questions.",
    seoTitle: "UCAT data and probability practice questions (Decision Making)",
    seoDescription:
      "Free UCAT Decision Making practice for percentages, complements, survey denominators and at-least-one probability. Built for UK medicine applicants.",
    canonicalPath: "/ucat-data-logic-practice-questions",
    icon: BarChart3,
    skillSummary:
      "Spot the hidden calculation: complements, the right denominator, and independent at-least-one probability.",
    introBullets: [
      "Practise complements, missing percentages and respondent denominators.",
      "Train at-least-one and first-player advantage without A-level algebra.",
      "Five reviewed questions per drill. More batches are added after manual review.",
    ],
    questions: getLocalDmTrainerQuestions("data-logic"),
    analyticsType: "dm_data_logic",
  },
  "argument-judge": {
    type: "argument-judge",
    title: "Argument Judge",
    hubDescription:
      "Identify the exact aim of an argument question, spot irrelevant or assumption-based options, and choose the strongest argument.",
    seoTitle: "UCAT strongest argument practice questions (Decision Making)",
    seoDescription:
      "Free UCAT Decision Making practice for strongest argument and relevance judgement. Match the exact aim of each stem, not what sounds sensible.",
    canonicalPath: "/ucat-argument-judge-practice-questions",
    icon: Scale,
    skillSummary:
      "The strongest option is the one that most directly answers the exact aim in the stem, with clear scope and support.",
    introBullets: [
      "State the exact aim before you read the options.",
      "Reject true-but-irrelevant, too-narrow and unsupported-assumption options.",
      "Five reviewed questions per drill. More batches are added after manual review.",
    ],
    questions: getLocalDmTrainerQuestions("argument-judge"),
    analyticsType: "dm_argument_judge",
  },
};

export function getDmTrainerConfig(type: DmTrainerType): DmTrainerConfig {
  return DM_TRAINER_CONFIGS[type];
}

export const DM_TRAINER_TYPES = Object.keys(DM_TRAINER_CONFIGS) as DmTrainerType[];
