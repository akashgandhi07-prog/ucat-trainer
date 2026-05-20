import type { QLQuestionKind, QLSection } from "../types/questionLab.ts";

/** Trainer type → repo filenames under question-lab/ */
export const TRAINER_TYPE_SLUG: Record<string, string> = {
  "venn-logic": "dm-venn-logic",
  "data-logic": "dm-data-logic",
  "argument-judge": "dm-argument-judge",
  "sjt-appropriateness": "sjt-appropriateness",
  "sjt-importance": "sjt-importance",
  "sjt-ranking": "sjt-ranking",
  inference: "inference",
  "vr-passages": "vr-passages",
  "qr-conversions": "qr-conversions",
};

export type TrainerMeta = {
  trainerType: string;
  label: string;
  section: QLSection;
  questionKind: QLQuestionKind;
  supportsImport: boolean;
  supportsGenerate: boolean;
  supportsLocalBank: boolean;
  importHint?: string;
};

export const TRAINER_META: Record<string, TrainerMeta> = {
  "venn-logic": {
    trainerType: "venn-logic",
    label: "DM · Venn Logic",
    section: "dm",
    questionKind: "mcq",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
  "data-logic": {
    trainerType: "data-logic",
    label: "DM · Data Logic",
    section: "dm",
    questionKind: "mcq",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
  "argument-judge": {
    trainerType: "argument-judge",
    label: "DM · Argument Judge",
    section: "dm",
    questionKind: "mcq",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
  "sjt-appropriateness": {
    trainerType: "sjt-appropriateness",
    label: "SJT · Appropriateness",
    section: "sjt",
    questionKind: "appropriateness",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
  "sjt-importance": {
    trainerType: "sjt-importance",
    label: "SJT · Importance",
    section: "sjt",
    questionKind: "importance",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
  "sjt-ranking": {
    trainerType: "sjt-ranking",
    label: "SJT · Ranking",
    section: "sjt",
    questionKind: "ranking",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
  inference: {
    trainerType: "inference",
    label: "VR · Inference",
    section: "vr",
    questionKind: "mcq",
    supportsImport: false,
    supportsGenerate: false,
    supportsLocalBank: true,
    importHint:
      "Inference uses passage-linked spans. Import is not supported yet; add via the inference bank in code.",
  },
  "vr-passages": {
    trainerType: "vr-passages",
    label: "VR · Passages",
    section: "vr",
    questionKind: "true-false-ct",
    supportsImport: false,
    supportsGenerate: false,
    supportsLocalBank: false,
    importHint:
      "Full passages need a dedicated import flow. Use DM trainers for now.",
  },
  "qr-conversions": {
    trainerType: "qr-conversions",
    label: "QR · Conversions",
    section: "qr",
    questionKind: "numeric",
    supportsImport: true,
    supportsGenerate: true,
    supportsLocalBank: true,
  },
};

export const QUESTION_LAB_TRAINER_TYPES = Object.keys(TRAINER_META);
