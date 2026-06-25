import { supabase } from "./supabase";
import { getAllLocalDmTrainerQuestions } from "../data/dmTrainers/localQuestions";
import { getInferenceQuestionsForPassage } from "../data/inferenceQuestions";
import { PASSAGES } from "../data/passages";

/**
 * Resolves a flagged-question `question_identifier` back to its actual content
 * for the admin panel. DM, Inference and Distortion resolve from the local
 * bundle (no RLS); SJT and Syllogism are best-effort DB reads that degrade
 * gracefully (the Hide action does not depend on a successful read).
 */

export type ResolvedOption = { id?: string; text: string; correct?: boolean; label?: string };

export type ResolvedQuestion = {
  kind: "dm" | "inference" | "syllogism" | "sjt" | "distortion" | "unknown";
  resolved: boolean;
  title?: string;
  stem?: string;
  question?: string;
  options?: ResolvedOption[];
  correctAnswer?: string;
  explanation?: string;
  passageText?: string;
  highlightText?: string;
  extra?: Record<string, string>;
  message?: string;
};

function unresolved(kind: ResolvedQuestion["kind"], message: string): ResolvedQuestion {
  return { kind, resolved: false, message };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export async function resolveFlaggedQuestion(
  identifier: string,
  questionKind: string,
): Promise<ResolvedQuestion> {
  const parts = identifier.split(":");
  const prefix = parts[0];

  try {
    if (prefix === "dm_trainer") {
      const id = parts.slice(1).join(":");
      const q = getAllLocalDmTrainerQuestions().find((x) => x.id === id);
      if (!q) return unresolved("dm", `No DM question with id "${id}" in the local bank.`);
      return {
        kind: "dm",
        resolved: true,
        stem: q.stem,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, text: o.text, correct: o.id === q.correctAnswer, label: o.label })),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        extra: { difficulty: q.difficulty, skillTag: q.skillTag, commonTrap: q.commonTrap },
      };
    }

    if (prefix === "inference") {
      const passageId = parts[1];
      const qid = parts.slice(2).join(":");
      const passage = PASSAGES.find((p) => p.id === passageId);
      if (!passage) return unresolved("inference", `Passage "${passageId}" not found.`);
      const q = getInferenceQuestionsForPassage(passage.id, passage.text).find((x) => x.id === qid);
      if (!q) return unresolved("inference", `Question "${qid}" not found in passage ${passageId}.`);
      const span = q.correctSpans?.[0];
      return {
        kind: "inference",
        resolved: true,
        title: passage.title,
        stem: q.questionText,
        explanation: q.explanation,
        passageText: passage.text,
        highlightText: span ? passage.text.slice(span.start, span.end) : undefined,
        extra: { difficulty: q.difficulty ?? "" },
      };
    }

    if (prefix === "distortion") {
      const passageId = parts[1];
      const passage = PASSAGES.find((p) => p.id === passageId);
      if (!passage) return unresolved("distortion", `Passage "${passageId}" not found.`);
      return {
        kind: "distortion",
        resolved: true,
        title: passage.title,
        passageText: passage.text,
        message:
          "Speed Reading items are generated from this passage, so the individual flagged item can't be shown. You can hide the whole passage from the pool.",
      };
    }

    if (prefix === "syllogism") {
      const id = parts.slice(1).join(":");
      for (const table of ["syllogism_questions", "syllogisms"]) {
        const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
        if (data) {
          const row = data as Record<string, unknown>;
          return {
            kind: "syllogism",
            resolved: true,
            stem: str(row.stimulus_text),
            question: str(row.conclusion_text),
            correctAnswer: row.is_correct ? "Conclusion follows (True)" : "Does not follow (False)",
            explanation: str(row.explanation),
            extra: { logic_group: str(row.logic_group), trick_type: str(row.trick_type) },
          };
        }
      }
      return unresolved("syllogism", "Could not read this syllogism from the database (it may be RLS-restricted). Hiding still works.");
    }

    if (prefix === "sjt") {
      const id = parts[1];
      const itemId = parts[2];
      const tables =
        questionKind === "sjt_ranking"
          ? ["sjt_ranking_questions"]
          : ["sjt_appropriateness_questions", "sjt_importance_questions", "sjt_ranking_questions"];
      for (const table of tables) {
        const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
        if (data) {
          const row = data as Record<string, unknown>;
          const items = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
          const flagged = items.find((it) => str(it.id) === itemId);
          return {
            kind: "sjt",
            resolved: true,
            stem: str(row.stem),
            options: items.map((it) => ({ text: str(it.text), correct: itemId ? str(it.id) === itemId : undefined })),
            explanation: str(flagged?.rationale ?? row.pivotInsight),
            extra: {
              domain: str(row.domain),
              difficulty: str(row.difficulty),
              flaggedItem: str(flagged?.text),
            },
          };
        }
      }
      return unresolved("sjt", "Could not read this SJT question from the database (it may be RLS-restricted). Hiding still works.");
    }
  } catch {
    return unresolved("unknown", "Error while resolving this question.");
  }

  return unresolved("unknown", `Unrecognised identifier "${identifier}".`);
}
