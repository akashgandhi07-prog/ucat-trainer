import { supabase } from "./supabase";
import type { GenerateTrainerQuestionsResult } from "./questionLabGenerate/types";

export type InvokeGenerateInput = {
  trainerType: string;
  count?: number;
  skillTag?: string;
  difficulty?: string;
  outputSpec: string;
  goldStandard: string;
};

export type InvokeGenerateResponse =
  | ({ ok: true } & GenerateTrainerQuestionsResult)
  | {
      ok: false;
      error: string;
      generated?: number;
      failed?: number;
      flagged?: number;
      questions?: GenerateTrainerQuestionsResult["questions"];
    };

export async function invokeGenerateTrainerQuestions(
  input: InvokeGenerateInput,
): Promise<InvokeGenerateResponse> {
  const { data, error } = await supabase.functions.invoke("generate-trainer-questions", {
    body: {
      trainerType: input.trainerType,
      count: input.count ?? 5,
      skillTag: input.skillTag || undefined,
      difficulty: input.difficulty || undefined,
      outputSpec: input.outputSpec,
      goldStandard: input.goldStandard,
    },
  });

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Edge function call failed. Deploy generate-trainer-questions and set OPENROUTER_API_KEY.",
    };
  }

  const payload = data as InvokeGenerateResponse & { error?: string };
  if (payload && typeof payload === "object" && "error" in payload && payload.error) {
    return { ok: false, error: String(payload.error) };
  }

  if (payload?.ok) return payload;

  return {
    ok: false,
    error: "Unexpected response from generate-trainer-questions.",
  };
}
