import type { TrainerGenerateProfile } from "./types.ts";

export const GENERATE_PROFILES: Record<string, TrainerGenerateProfile> = {
  "venn-logic": {
    trainerType: "venn-logic",
    slug: "dm-venn-logic",
    label: "DM · Venn Logic",
    questionKind: "mcq",
    plugins: ["set-logic"],
    batchSize: 5,
    requiresGoldExamples: true,
  },
  "data-logic": {
    trainerType: "data-logic",
    slug: "dm-data-logic",
    label: "DM · Data Logic",
    questionKind: "mcq",
    plugins: ["numeric"],
    batchSize: 5,
    requiresGoldExamples: true,
  },
  "argument-judge": {
    trainerType: "argument-judge",
    slug: "dm-argument-judge",
    label: "DM · Argument Judge",
    questionKind: "mcq",
    plugins: [],
    batchSize: 5,
    requiresGoldExamples: true,
  },
  "sjt-appropriateness": {
    trainerType: "sjt-appropriateness",
    slug: "sjt-appropriateness",
    label: "SJT · Appropriateness",
    questionKind: "appropriateness",
    plugins: ["sjt-structure"],
    batchSize: 5,
    requiresGoldExamples: true,
  },
  "sjt-importance": {
    trainerType: "sjt-importance",
    slug: "sjt-importance",
    label: "SJT · Importance",
    questionKind: "importance",
    plugins: ["sjt-structure"],
    batchSize: 5,
    requiresGoldExamples: true,
  },
  "sjt-ranking": {
    trainerType: "sjt-ranking",
    slug: "sjt-ranking",
    label: "SJT · Ranking",
    questionKind: "ranking",
    plugins: ["sjt-structure"],
    batchSize: 5,
    requiresGoldExamples: true,
  },
  "vr-passages": {
    trainerType: "vr-passages",
    slug: "vr-passages",
    label: "VR · Passages",
    questionKind: "true-false-ct",
    plugins: ["vr-structure"],
    // Each item is a full passage plus four questions, so keep batches small.
    batchSize: 3,
    requiresGoldExamples: true,
  },
  "qr-conversions": {
    trainerType: "qr-conversions",
    slug: "qr-conversions",
    label: "QR · Conversions",
    questionKind: "numeric",
    plugins: ["numeric"],
    batchSize: 5,
    requiresGoldExamples: true,
  },
};

export function getGenerateProfile(trainerType: string): TrainerGenerateProfile | null {
  return GENERATE_PROFILES[trainerType] ?? null;
}

export const GENERATE_TRAINER_TYPES = Object.keys(GENERATE_PROFILES);
