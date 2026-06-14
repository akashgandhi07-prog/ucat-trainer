import type { QuestionExplanation } from "../components/mentalMaths/mathsAlgorithms";
import { CONVERSION_QUESTIONS, type ConversionQuestion } from "../data/conversionQuestions";
import { supabase } from "./supabase";
import { withTimeout } from "./withTimeout";

function mapConversionQuestion(raw: unknown): ConversionQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = row.id;
  const category = row.category;
  const prompt = row.prompt;
  const answer = row.answer;
  const answerLabel = row.answerLabel;
  const explanation = row.explanation;

  if (
    typeof id !== "string" ||
    typeof category !== "string" ||
    typeof prompt !== "string" ||
    typeof answer !== "number" ||
    !Number.isFinite(answer) ||
    typeof answerLabel !== "string" ||
    !explanation ||
    typeof explanation !== "object"
  ) {
    return null;
  }

  const exp = explanation as QuestionExplanation;
  if (!exp.method || typeof exp.examShortcut !== "string") return null;

  return {
    id,
    category: category as ConversionQuestion["category"],
    prompt,
    answer,
    answerLabel,
    explanation: exp,
  };
}

export async function fetchConversionDrill(): Promise<{
  questions: ConversionQuestion[];
  source: "supabase" | "local";
}> {
  try {
    // Cap the wait so a stalled RPC falls back to the local bank instead of
    // leaving the trainer on an endless loading state.
    const { data, error } = await withTimeout(supabase.rpc("get_qr_conversion_drill"), 8000);
    if (error) throw error;
    const rawList = Array.isArray(data) ? data : [];
    const mapped = rawList
      .map((row) => mapConversionQuestion(row))
      .filter((q): q is ConversionQuestion => q != null);
    if (mapped.length >= 1) {
      return { questions: mapped, source: "supabase" };
    }
  } catch {
    // fall through
  }
  return { questions: CONVERSION_QUESTIONS, source: "local" };
}
