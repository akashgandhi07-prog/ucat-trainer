import { supabase } from "./supabase";
import { summariseGenerateResult } from "./questionLabGenerate/pipeline";
import type { ImportDraftPayload } from "./questionLabMapImport";
import type {
  GeneratePhase,
  GenerateTrainerQuestionsResult,
  QuestionVerifyOutcome,
} from "./questionLabGenerate/types";

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

const PHASE_TIMEOUT_MS: Record<GeneratePhase, number> = {
  generate: 180_000,
  verify: 180_000,
  repair: 180_000,
  import: 60_000,
};

type PhasePayload = Record<string, unknown>;

async function invokePhase(
  phase: GeneratePhase,
  body: PhasePayload,
  timeoutMs: number,
): Promise<{ data: unknown; error: unknown }> {
  const invokePromise = supabase.functions.invoke("generate-trainer-questions", {
    body: { phase, ...body },
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        data: null,
        error: {
          message: `Step "${phase}" timed out after ${Math.round(timeoutMs / 1000)}s.`,
        },
      });
    }, timeoutMs);
  });

  const result = await Promise.race([invokePromise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });

  return result;
}

/** Pull the real message from a 4xx/5xx edge response (supabase-js often only says "non-2xx"). */
async function extractInvokeError(
  data: unknown,
  error: unknown,
  phase: GeneratePhase,
): Promise<string> {
  const payload = data as { error?: string } | null;
  if (payload?.error) return String(payload.error);

  if (error && typeof error === "object") {
    const e = error as { message?: string; context?: Response };
    if (e.context && typeof e.context.json === "function") {
      try {
        const body = (await e.context.json()) as { error?: string };
        if (body?.error) return String(body.error);
      } catch {
        /* response body already read or not JSON */
      }
    }
    const msg = e.message ?? "";
    if (msg && !/non-2xx/i.test(msg)) return msg;
    if (/non-2xx/i.test(msg)) {
      return `Step "${phase}" failed on the server. Open Supabase → Edge Functions → generate-trainer-questions → Logs. Common causes: missing OPENROUTER_API_KEY, or the function crashed on startup.`;
    }
  }

  return `Step "${phase}" failed. Check Edge Function logs in Supabase.`;
}

export type PhasedGenerateOptions = {
  onLog?: (line: string) => void;
};

/** Runs generate → verify → repair → import with live progress lines for the admin UI. */
export async function invokeGenerateTrainerQuestionsPhased(
  input: InvokeGenerateInput,
  options?: PhasedGenerateOptions,
): Promise<InvokeGenerateResponse> {
  const log = (line: string) => options?.onLog?.(line);

  const base = {
    trainerType: input.trainerType,
    count: input.count ?? 5,
    skillTag: input.skillTag || undefined,
    difficulty: input.difficulty || undefined,
    outputSpec: input.outputSpec,
    goldStandard: input.goldStandard,
  };

  log("Starting pipeline for " + input.trainerType + "…");

  log("Step 1 of 4: Calling OpenRouter (generate model) to draft questions…");
  const genRes = await invokePhase("generate", base, PHASE_TIMEOUT_MS.generate);
  const genErr = await extractInvokeError(genRes.data, genRes.error, "generate");
  if (genRes.error || (genRes.data as { error?: string } | null)?.error) {
    log(`Step 1 failed: ${genErr}`);
    return { ok: false, error: genErr };
  }

  const gen = genRes.data as {
    ok?: boolean;
    log?: string;
    questions?: Record<string, unknown>[];
    generated?: number;
    generateModel?: string;
  };
  if (gen?.ok !== true || !Array.isArray(gen.questions)) {
    const unexpected = await extractInvokeError(genRes.data, genRes.error, "generate");
    log(`Step 1 failed: ${unexpected}`);
    return { ok: false, error: unexpected };
  }
  log(
    gen.log ??
      `Step 1 done: received ${gen.questions?.length ?? 0} question(s) from the generate model.`,
  );

  log("Step 2 of 4: Copy checks, trap plugins, and audit model (parallel per question)…");
  const verifyRes = await invokePhase(
    "verify",
    { ...base, questions: gen.questions },
    PHASE_TIMEOUT_MS.verify,
  );
  const verifyErr = await extractInvokeError(verifyRes.data, verifyRes.error, "verify");
  if (verifyRes.error || (verifyRes.data as { error?: string } | null)?.error) {
    log(`Step 2 failed: ${verifyErr}`);
    return { ok: false, error: verifyErr };
  }

  const verify = verifyRes.data as {
    ok: true;
    log?: string;
    outcomes: QuestionVerifyOutcome[];
    drafts: ImportDraftPayload[];
    repairCandidates: Array<{
      legacyId: string;
      raw: Record<string, unknown>;
      outcome: QuestionVerifyOutcome;
    }>;
    generated: number;
    auditModel?: string;
  };
  log(verify.log ?? "Step 2 done: verification finished.");

  let outcomes = verify.outcomes;
  let drafts = verify.drafts;
  let repairAttempted = 0;
  let repairSucceeded = 0;

  const repairCount = verify.repairCandidates?.length ?? 0;
  if (repairCount > 0) {
    log(
      `Step 3 of 4: Calling OpenRouter (repair model) for ${repairCount} flagged draft(s)…`,
    );
    const repairRes = await invokePhase(
      "repair",
      {
        ...base,
        outcomes,
        drafts,
        repairCandidates: verify.repairCandidates,
      },
      PHASE_TIMEOUT_MS.repair,
    );
    const repairErr = await extractInvokeError(repairRes.data, repairRes.error, "repair");
    if (repairRes.error || (repairRes.data as { error?: string } | null)?.error) {
      log(`Step 3 failed: ${repairErr}`);
      return { ok: false, error: repairErr };
    }

    const repair = repairRes.data as {
      ok: true;
      log?: string;
      outcomes: QuestionVerifyOutcome[];
      drafts: ImportDraftPayload[];
      repairAttempted: number;
      repairSucceeded: number;
    };
    outcomes = repair.outcomes;
    drafts = repair.drafts;
    repairAttempted = repair.repairAttempted;
    repairSucceeded = repair.repairSucceeded;
    log(repair.log ?? "Step 3 done: repair pass finished.");
  } else {
    log("Step 3 of 4: Skipped (no drafts needed AI repair).");
  }

  log("Step 4 of 4: Saving importable drafts to Review Queue…");
  const importRes = await invokePhase(
    "import",
    { ...base, drafts },
    PHASE_TIMEOUT_MS.import,
  );
  const importErr = await extractInvokeError(importRes.data, importRes.error, "import");
  if (importRes.error || (importRes.data as { error?: string } | null)?.error) {
    log(`Step 4 failed: ${importErr}`);
    return { ok: false, error: importErr };
  }

  const imp = importRes.data as {
    ok: true;
    log?: string;
    created: number;
    updated: number;
    skipped: Array<{ legacy_id: string; reason: string }>;
    errors: Array<{ legacy_id?: string | null; message: string }>;
  };
  log(imp.log ?? "Step 4 done: import finished.");

  const importedLegacyIds = new Set(drafts.map((d) => d.legacy_id));
  const result = summariseGenerateResult(
    verify.generated,
    outcomes,
    {
      created: imp.created,
      updated: imp.updated,
      skipped: imp.skipped ?? [],
      errors: imp.errors ?? [],
    },
    importedLegacyIds,
    repairAttempted,
    repairSucceeded,
  );

  return { ok: true, ...result };
}

/** Single edge call (no live step log). Prefer invokeGenerateTrainerQuestionsPhased in the admin UI. */
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

  const INVOKE_TIMEOUT_MS = 240_000;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        data: null,
        error: {
          message:
            "Generation timed out after 4 minutes. Refresh Review Queue or try again.",
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
          "The generate request took too long. Try again or check Supabase Edge Function logs.",
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
