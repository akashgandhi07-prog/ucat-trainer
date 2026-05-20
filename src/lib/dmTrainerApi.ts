import { supabase } from "./supabase";
import type { DmTrainerQuestion, DmTrainerType } from "../types/dmTrainers";
import { getLocalDmTrainerQuestions } from "../data/dmTrainers/localQuestions";

function mapQuestion(raw: unknown): DmTrainerQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id;
  const trainerType = row.trainerType;
  const stem = row.stem;
  const question = row.question;
  const correctAnswer = row.correctAnswer;
  const explanation = row.explanation;
  const skillTag = row.skillTag;
  const commonTrap = row.commonTrap;
  const options = row.options;
  const review = row.review;

  if (
    typeof id !== "string" ||
    typeof trainerType !== "string" ||
    typeof stem !== "string" ||
    typeof question !== "string" ||
    typeof correctAnswer !== "string" ||
    typeof explanation !== "string" ||
    typeof skillTag !== "string" ||
    typeof commonTrap !== "string" ||
    !Array.isArray(options) ||
    !review ||
    typeof review !== "object"
  ) {
    return null;
  }

  return {
    id,
    dbId: typeof row.dbId === "string" ? row.dbId : undefined,
    trainerType: trainerType as DmTrainerQuestion["trainerType"],
    difficulty: (row.difficulty as DmTrainerQuestion["difficulty"]) ?? "medium",
    stem,
    question,
    options: options as DmTrainerQuestion["options"],
    correctAnswer: correctAnswer as DmTrainerQuestion["correctAnswer"],
    explanation,
    skillTag,
    commonTrap,
    optionalWorkingSteps: Array.isArray(row.optionalWorkingSteps)
      ? (row.optionalWorkingSteps as string[])
      : undefined,
    generalRule: typeof row.generalRule === "string" ? row.generalRule : undefined,
    wrongOptionReasons:
      row.wrongOptionReasons && typeof row.wrongOptionReasons === "object"
        ? (row.wrongOptionReasons as DmTrainerQuestion["wrongOptionReasons"])
        : undefined,
    keyInsight: typeof row.keyInsight === "string" ? row.keyInsight : undefined,
    review: review as DmTrainerQuestion["review"],
  };
}

export async function fetchDmTrainerDrill(
  trainerType: DmTrainerType,
): Promise<{ questions: DmTrainerQuestion[]; source: "supabase" | "local" }> {
  const fallback = getLocalDmTrainerQuestions(trainerType);

  try {
    const { data, error } = await supabase.rpc("get_dm_trainer_drill", {
      p_trainer_type: trainerType,
    });

    if (error) throw error;

    const rawList = Array.isArray(data) ? data : [];
    const mapped = rawList
      .map((row) => mapQuestion(row))
      .filter((q): q is DmTrainerQuestion => q != null);

    if (mapped.length >= 1) {
      // Enrich Supabase questions with local teaching fields (generalRule, wrongOptionReasons,
      // keyInsight) which aren't stored in the database yet.
      const localById = new Map(fallback.map((q) => [q.id, q]));
      const enriched = mapped.map((q) => {
        const local = localById.get(q.id);
        if (!local) return q;
        return {
          ...q,
          generalRule: q.generalRule ?? local.generalRule,
          wrongOptionReasons: q.wrongOptionReasons ?? local.wrongOptionReasons,
          keyInsight: q.keyInsight ?? local.keyInsight,
        };
      });
      return { questions: enriched, source: "supabase" };
    }
  } catch {
    // fall through to local seed
  }

  return { questions: fallback, source: "local" };
}
