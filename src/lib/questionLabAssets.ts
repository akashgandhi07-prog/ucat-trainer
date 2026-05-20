import {
  QUESTION_LAB_TRAINER_TYPES,
  TRAINER_META,
  TRAINER_TYPE_SLUG,
  type TrainerMeta,
} from "./questionLabTrainerMeta";

export {
  QUESTION_LAB_TRAINER_TYPES,
  TRAINER_META,
  TRAINER_TYPE_SLUG,
  type TrainerMeta,
};

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

export { countOfficialExamples } from "./questionLabGoldStats";

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
