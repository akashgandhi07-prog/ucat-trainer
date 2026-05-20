import type { QLQuestionKind, QLSection } from "../types/questionLab";

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
    supportsLocalBank: true,
  },
  "data-logic": {
    trainerType: "data-logic",
    label: "DM · Data Logic",
    section: "dm",
    questionKind: "mcq",
    supportsImport: true,
    supportsLocalBank: true,
  },
  "argument-judge": {
    trainerType: "argument-judge",
    label: "DM · Argument Judge",
    section: "dm",
    questionKind: "mcq",
    supportsImport: true,
    supportsLocalBank: true,
  },
  "sjt-appropriateness": {
    trainerType: "sjt-appropriateness",
    label: "SJT · Appropriateness",
    section: "sjt",
    questionKind: "appropriateness",
    supportsImport: true,
    supportsLocalBank: true,
  },
  "sjt-importance": {
    trainerType: "sjt-importance",
    label: "SJT · Importance",
    section: "sjt",
    questionKind: "importance",
    supportsImport: true,
    supportsLocalBank: true,
  },
  "sjt-ranking": {
    trainerType: "sjt-ranking",
    label: "SJT · Ranking",
    section: "sjt",
    questionKind: "ranking",
    supportsImport: true,
    supportsLocalBank: true,
  },
  inference: {
    trainerType: "inference",
    label: "VR · Inference",
    section: "vr",
    questionKind: "mcq",
    supportsImport: false,
    supportsLocalBank: true,
    importHint: "Inference uses passage-linked spans. Import is not supported yet; add via the inference bank in code.",
  },
  "vr-passages": {
    trainerType: "vr-passages",
    label: "VR · Passages",
    section: "vr",
    questionKind: "true-false-ct",
    supportsImport: false,
    supportsLocalBank: false,
    importHint: "Full passages need a dedicated import flow. Use DM trainers for now.",
  },
  "qr-conversions": {
    trainerType: "qr-conversions",
    label: "QR · Conversions",
    section: "qr",
    questionKind: "numeric",
    supportsImport: true,
    supportsLocalBank: true,
  },
};

export const QUESTION_LAB_TRAINER_TYPES = Object.keys(TRAINER_META);

const officialExamplesGlob = import.meta.glob(
  "../../question-lab/gold-standards/*.md",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

const outputSpecsGlob = import.meta.glob(
  "../../question-lab/output-specs/*.md",
  { eager: true, query: "?raw", import: "default" },
) as Record<string, string>;

function contentFromGlob(
  glob: Record<string, string>,
  filename: string,
): string | null {
  const key = Object.keys(glob).find((path) => path.endsWith(`/${filename}`));
  return key ? glob[key] : null;
}

export function slugForTrainerType(trainerType: string): string | null {
  return TRAINER_TYPE_SLUG[trainerType] ?? null;
}

export function getTrainerMeta(trainerType: string): TrainerMeta | null {
  return TRAINER_META[trainerType] ?? null;
}

export function getOfficialExamplesMarkdown(trainerType: string): string | null {
  const slug = slugForTrainerType(trainerType);
  if (!slug) return null;
  return contentFromGlob(officialExamplesGlob, `${slug}.md`);
}

export function getOutputSpecMarkdown(trainerType: string): string | null {
  const slug = slugForTrainerType(trainerType);
  if (!slug) return null;
  return contentFromGlob(outputSpecsGlob, `${slug}.md`);
}

/** How many official examples appear to be pasted (after the --- divider). */
export function countOfficialExamples(md: string): { count: number; isEmpty: boolean; wordCount: number } {
  const parts = md.split(/\n---\n/);
  const body = (parts.length > 1 ? parts.slice(1).join("\n---\n") : md).trim();
  const placeholder = /\[Paste official examples below/i.test(body);
  const examples = (body.match(/^###\s+Example\b/gim) ?? []).length;
  const numbered = (body.match(/^Example\s+\d+/gim) ?? []).length;
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const count = Math.max(examples, numbered, placeholder || wordCount < 40 ? 0 : wordCount >= 120 ? 1 : 0);
  return { count, isEmpty: placeholder || wordCount < 40, wordCount };
}

export type BankExportRow = {
  id: string;
  legacy_id: string | null;
  status: string;
  difficulty: string;
  skill_tag: string;
  stem: string;
  explanation: string;
  content: Record<string, unknown>;
  quality_status: string;
  quality_notes: string | null;
  _source?: "database" | "local-files" | "merged";
};

export function formatCurrentBankForAi(
  trainerType: string,
  rows: BankExportRow[],
  meta: { sourceLabel: string },
): string {
  const payload = rows.map((r) => ({
    id: r.legacy_id ?? r.id,
    db_id: r.id,
    status: r.status,
    difficulty: r.difficulty,
    skill_tag: r.skill_tag,
    stem: r.stem,
    explanation: r.explanation,
    content: r.content,
    quality_status: r.quality_status,
    quality_notes: r.quality_notes,
    source: r._source ?? "database",
  }));

  return [
    `# Current bank: ${trainerType}`,
    `# Source: ${meta.sourceLabel}`,
    "",
    `${rows.length} question(s). Use to audit quality, spot duplicates, or avoid repeating scenarios.`,
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");
}

export async function fetchOfficialExamplesFromApi(
  trainerType: string,
): Promise<string | null> {
  const slug = slugForTrainerType(trainerType);
  if (!slug) return null;
  try {
    const response = await fetch(`/__question-lab/gold-standards/${slug}.md`);
    if (!response.ok) return getOfficialExamplesMarkdown(trainerType);
    const data = (await response.json()) as { content?: string };
    return data.content ?? getOfficialExamplesMarkdown(trainerType);
  } catch {
    return getOfficialExamplesMarkdown(trainerType);
  }
}

export async function fetchOutputSpecFromApi(
  trainerType: string,
): Promise<string | null> {
  const slug = slugForTrainerType(trainerType);
  if (!slug) return null;
  try {
    const response = await fetch(`/__question-lab/output-specs/${slug}.md`);
    if (!response.ok) return getOutputSpecMarkdown(trainerType);
    const data = (await response.json()) as { content?: string };
    return data.content ?? getOutputSpecMarkdown(trainerType);
  } catch {
    return getOutputSpecMarkdown(trainerType);
  }
}
