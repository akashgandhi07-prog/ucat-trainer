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

/** Edge function runs several OpenRouter calls; allow up to 4 minutes before surfacing an error. */
const INVOKE_TIMEOUT_MS = 240_000;

export async function invokeGenerateTrainerQuestions(
  input: InvokeGenerateInput,
): Promise<InvokeGenerateResponse> {
  const invokePromise = supabase.functions.invoke("generate-trainer-questions", {
    body: {
      trainerType: input.trainerType,
      count: input.count ?? 5,
      skillTag: input.skillTag || undefined,
      difficulty: input.difficulty || undefined,
      outputSpec: input.outputSpec,
      goldStandard: input.goldStandard,
    },
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        data: null,
        error: {
          message:
            "Generation timed out after 4 minutes. The server may still be running. Wait a minute, refresh Review Queue, or try again with fewer questions (we are improving speed).",
        },
      });
    }, INVOKE_TIMEOUT_MS);
  });

  const { data, error } = await Promise.race([invokePromise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });

  if (error) {
    const msg = error.message ?? "";
    if (/timed out|timeout|504|546/i.test(msg)) {
      return {
        ok: false,
        error:
          "The generate request took too long and was stopped. This often means the Edge Function hit its time limit while calling OpenRouter. Try again in a minute, or check Supabase Edge Function logs.",
      };
    }
    return {
      ok: false,
      error:
        msg ||
        "Edge function call failed. Deploy generate-trainer-questions and set OPENROUTER_API_KEY.",
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
