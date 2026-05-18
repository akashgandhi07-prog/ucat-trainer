export type LandingTrainerSection = "vr" | "dm" | "qr" | "sjt";

export type LandingTrainer = {
  id: string;
  section: LandingTrainerSection;
  title: string;
  description: string;
  href: string;
  tag?: string;
};

export const LANDING_TRAINER_SECTION_META: Record<
  LandingTrainerSection,
  { label: string; hubHref: string; summary: string }
> = {
  vr: {
    label: "Verbal Reasoning",
    hubHref: "/verbal",
    summary: "Reading speed, recall, scanning and inference at exam pace.",
  },
  dm: {
    label: "Decision Making",
    hubHref: "/decision-making",
    summary: "Syllogisms plus beta Venn, data and argument skills trainers.",
  },
  qr: {
    label: "Quantitative Reasoning",
    hubHref: "/quantitative",
    summary: "On-screen calculator fluency and non-calculator mental maths.",
  },
  sjt: {
    label: "Situational Judgement",
    hubHref: "/ucat-sjt-practice",
    summary: "Appropriateness rating, importance rating and ranking, all grounded in GMC Good Medical Practice.",
  },
};

export const LANDING_TRAINERS: readonly LandingTrainer[] = [
  {
    id: "speed-reading",
    section: "vr",
    title: "Speed reading",
    tag: "Live WPM",
    description: "Push reading speed with timed passages and live words-per-minute tracking.",
    href: "/ucat-verbal-reasoning-speed-reading-trainer",
  },
  {
    id: "rapid-recall",
    section: "vr",
    title: "Rapid recall",
    tag: "True / false",
    description: "Train whether statements match the passage, with instant feedback on each line.",
    href: "/ucat-rapid-recall-trainer",
  },
  {
    id: "keyword-scanning",
    section: "vr",
    title: "Keyword scanning",
    tag: "Timed scan",
    description: "Find the keyword under pressure when the text blurs on a timer.",
    href: "/ucat-keyword-scanning-trainer",
  },
  {
    id: "inference",
    section: "vr",
    title: "Inference trainer",
    tag: "Exam pace",
    description: "Practise conclusions that are fully supported by the passage, not assumptions.",
    href: "/ucat-inference-trainer",
  },
  {
    id: "syllogism-micro",
    section: "dm",
    title: "Syllogism micro drill",
    tag: "Under 10s",
    description: "One premise, one conclusion. Build pattern recognition with keyboard shortcuts.",
    href: "/train/syllogism/micro",
  },
  {
    id: "syllogism-macro",
    section: "dm",
    title: "Syllogism macro drill",
    tag: "5 conclusions",
    description: "Full UCAT-style stimulus with five yes/no conclusions beside the passage.",
    href: "/ucat-syllogism-practice-macro-drills",
  },
  {
    id: "venn-logic",
    section: "dm",
    title: "Venn Logic",
    tag: "Set logic",
    description: "Translate exactly, only and neither into set regions without double counting.",
    href: "/ucat-venn-logic-practice-questions",
  },
  {
    id: "data-logic",
    section: "dm",
    title: "Data Logic",
    tag: "Data skills",
    description: "Percentages, complements, denominators and at-least-one probability.",
    href: "/ucat-data-logic-practice-questions",
  },
  {
    id: "argument-judge",
    section: "dm",
    title: "Argument Judge",
    tag: "Arguments",
    description: "Match the exact aim of the stem when choosing the strongest argument.",
    href: "/ucat-argument-judge-practice-questions",
  },
  {
    id: "calculator",
    section: "qr",
    title: "Calculator trainer",
    tag: "Keypad speed",
    description: "Muscle memory on the on-screen calculator with heatmaps for slow keys.",
    href: "/train/calculator",
  },
  {
    id: "mental-maths",
    section: "qr",
    title: "Mental maths trainer",
    tag: "No calculator",
    description: "Stages of arithmetic and estimation when the calculator is not an option.",
    href: "/ucat-mental-maths-trainer",
  },
  {
    id: "sjt-appropriateness",
    section: "sjt",
    title: "Appropriateness Rater",
    tag: "4-point scale",
    description: "Rate each response as Very Appropriate, Appropriate, Inappropriate or Very Inappropriate.",
    href: "/ucat-sjt-appropriateness-trainer",
  },
  {
    id: "sjt-importance",
    section: "sjt",
    title: "Importance Rater",
    tag: "Partial credit",
    description: "Rate each consideration from Very Important down to Not Important at All.",
    href: "/ucat-sjt-importance-trainer",
  },
  {
    id: "sjt-ranking",
    section: "sjt",
    title: "Ranking Trainer",
    tag: "Most / least",
    description: "Select the most and least appropriate response from three options.",
    href: "/ucat-sjt-ranking-trainer",
  },
] as const;

export const LANDING_TRAINER_COUNT = LANDING_TRAINERS.length;

export function trainersForSection(section: LandingTrainerSection): LandingTrainer[] {
  return LANDING_TRAINERS.filter((t) => t.section === section);
}
