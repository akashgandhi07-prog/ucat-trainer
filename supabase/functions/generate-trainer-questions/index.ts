// Deploy: supabase functions deploy generate-trainer-questions
// Secrets: OPENROUTER_API_KEY
// Optional: OPENROUTER_GENERATE_MODEL, OPENROUTER_AUDIT_MODEL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Side-effect imports so the bundler includes the full dependency tree.
import "../../../src/components/mentalMaths/mathsAlgorithms.ts";
import "../../../src/data/conversionQuestions.ts";
import "../../../src/lib/mcqContent.ts";
import "../../../src/lib/questionLabGenerate/audit.ts";
import "../../../src/lib/questionLabGenerate/autoFix.ts";
import "../../../src/lib/questionLabGenerate/copyQuality.ts";
import "../../../src/lib/questionLabGenerate/openrouter.ts";
import "../../../src/lib/questionLabGenerate/plugins/index.ts";
import "../../../src/lib/questionLabGenerate/plugins/numeric.ts";
import "../../../src/lib/questionLabGenerate/plugins/setLogic.ts";
import "../../../src/lib/questionLabGenerate/plugins/sjtStructure.ts";
import "../../../src/lib/questionLabGenerate/prompts.ts";
import "../../../src/lib/questionLabGenerate/repair.ts";
import "../../../src/lib/questionLabGenerate/types.ts";
import "../../../src/lib/questionLabGenerate/utils.ts";
import "../../../src/lib/questionLabGenerate/validateUniversal.ts";
import "../../../src/lib/questionLabGoldStats.ts";
import "../../../src/lib/questionLabMapImport.ts";
import "../../../src/lib/questionLabTrainerMeta.ts";
import "../../../src/lib/studentFacingCopy.ts";
import "../../../src/types/dmTrainers.ts";
import "../../../src/types/questionLab.ts";
import { countOfficialExamples } from "../../../src/lib/questionLabGoldStats.ts";
import type { ImportDraftPayload } from "../../../src/lib/questionLabMapImport.ts";
import type { GeneratePhase, QuestionVerifyOutcome } from "../../../src/lib/questionLabGenerate/types.ts";
import {
  buildVerifyRepairFeedback,
  summariseRepairReason,
} from "../../../src/lib/questionLabGenerate/repair.ts";
import {
  generateAndVerifyQuestions,
  runGeneratePhase,
  runRepairPhase,
  runVerifyPhase,
  summariseGenerateResult,
} from "../../../src/lib/questionLabGenerate/pipeline.ts";
import { getGenerateProfile } from "../../../src/lib/questionLabGenerate/profiles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type RequestBody = {
  phase?: GeneratePhase;
  trainerType?: string;
  count?: number;
  skillTag?: string;
  difficulty?: string;
  outputSpec?: string;
  goldStandard?: string;
  questions?: Record<string, unknown>[];
  outcomes?: QuestionVerifyOutcome[];
  drafts?: ImportDraftPayload[];
  repairCandidates?: Array<{
    legacyId: string;
    raw: Record<string, unknown>;
    outcome: QuestionVerifyOutcome;
  }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openRouterKey) {
    return json({ error: "OPENROUTER_API_KEY is not configured on the server." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase env missing." }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return json({ error: "Forbidden: admin only" }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const trainerType = body.trainerType?.trim();
  if (!trainerType) return json({ error: "trainerType is required" }, 400);

  const profileGen = getGenerateProfile(trainerType);
  if (!profileGen) {
    return json({ error: "This trainer does not support AI generation." }, 400);
  }

  const outputSpec = body.outputSpec?.trim();
  const goldStandard = body.goldStandard?.trim();
  if (!outputSpec || !goldStandard) {
    return json({ error: "outputSpec and goldStandard are required." }, 400);
  }

  if (profileGen.requiresGoldExamples) {
    const goldStats = countOfficialExamples(goldStandard);
    if (goldStats.isEmpty) {
      return json({
        error:
          "Official examples look empty. Paste UCAT questions in Official examples, then try again.",
      }, 400);
    }
  }

  const { data: bankData } = await supabase.rpc("admin_get_trainer_questions", {
    p_section: null,
    p_trainer_type: trainerType,
    p_status: "active",
    p_quality_status: null,
    p_difficulty: null,
    p_is_flagged: null,
    p_search: null,
    p_limit: 40,
    p_offset: 0,
  });

  const bankRows = bankData?.rows ?? [];
  const existingStems = bankRows
    .map((r) => (typeof r.stem === "string" ? r.stem : ""))
    .filter(Boolean);

  const generateModel =
    Deno.env.get("OPENROUTER_GENERATE_MODEL") ?? "deepseek/deepseek-chat";
  const auditModel =
    Deno.env.get("OPENROUTER_AUDIT_MODEL") ?? "google/gemini-2.0-flash-001";
  const repairModel =
    Deno.env.get("OPENROUTER_REPAIR_MODEL") ??
    Deno.env.get("OPENROUTER_GENERATE_MODEL") ??
    "deepseek/deepseek-chat";

  const processInput = {
    trainerType,
    outputSpec,
    goldStandard,
    count: body.count ?? profileGen.batchSize,
    skillTag: body.skillTag,
    difficulty: body.difficulty,
    existingStems,
    openRouter: {
      apiKey: openRouterKey,
      generateModel,
      auditModel,
      repairModel,
    },
  };

  const phase = body.phase;

  try {
    if (phase === "generate") {
      const { questions, generated, count } = await runGeneratePhase(processInput);
      return json({
        ok: true,
        phase: "generate",
        log: `OpenRouter generate model returned ${questions.length} question(s) (parsed ${generated} from JSON).`,
        questions,
        generated,
        count,
        generateModel,
      });
    }

    if (phase === "verify") {
      const questions = body.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        return json({ error: "questions array is required for verify phase." }, 400);
      }
      const verify = await runVerifyPhase(processInput, questions);
      const repairWire = verify.repairCandidates.map((c) => ({
        legacyId: c.outcome.legacyId,
        raw: c.raw,
        outcome: c.outcome,
      }));
      const { repairReasons, blockedNotRepaired } = buildVerifyRepairFeedback(
        verify.outcomes,
        verify.repairCandidates,
      );
      return json({
        ok: true,
        phase: "verify",
        log: `Checked ${verify.outcomes.length} draft(s): ${verify.drafts.length} importable, ${repairWire.length} sent for repair.`,
        outcomes: verify.outcomes,
        drafts: verify.drafts,
        repairCandidates: repairWire,
        repairReasons,
        blockedNotRepaired,
        generated: verify.generated,
        auditModel,
      });
    }

    if (phase === "repair") {
      const outcomes = body.outcomes;
      const drafts = body.drafts;
      const repairWire = body.repairCandidates;
      if (!Array.isArray(outcomes) || !Array.isArray(drafts) || !Array.isArray(repairWire)) {
        return json({
          error: "outcomes, drafts, and repairCandidates are required for repair phase.",
        }, 400);
      }
      const candidates = repairWire.map((c) => ({
        outcome: c.outcome,
        raw: c.raw,
      }));
      const beforeById = new Map(
        outcomes.map((o) => [o.legacyId, o.qualityStatus] as const),
      );
      const repaired = await runRepairPhase(processInput, {
        outcomes,
        drafts,
        repairCandidates: candidates,
      });
      const repairResults = candidates.map((c) => {
        const after = repaired.outcomes.find((o) => o.legacyId === c.outcome.legacyId);
        const beforeStatus = beforeById.get(c.outcome.legacyId) ?? c.outcome.qualityStatus;
        const afterStatus = after?.qualityStatus ?? "fail";
        const accuracyPercent = after?.layer3?.accuracyPercent ?? 0;
        return {
          legacyId: c.outcome.legacyId,
          beforeStatus,
          afterStatus,
          improved: afterStatus === "pass",
          accuracyPercent,
          reasons: after ? summariseRepairReason(after).reasons : "Repair returned no item.",
        };
      });
      return json({
        ok: true,
        phase: "repair",
        log:
          repaired.repairAttempted > 0
            ? `Repair model updated ${repaired.repairSucceeded} of ${repaired.repairAttempted} draft(s).`
            : "No repair pass needed.",
        outcomes: repaired.outcomes,
        drafts: repaired.drafts,
        repairAttempted: repaired.repairAttempted,
        repairSucceeded: repaired.repairSucceeded,
        repairResults,
        repairModel,
      });
    }

    if (phase === "import") {
      const drafts = body.drafts;
      if (!Array.isArray(drafts)) {
        return json({ error: "drafts array is required for import phase." }, 400);
      }
      if (drafts.length === 0) {
        return json({
          ok: true,
          phase: "import",
          log: "No importable drafts (all blocked or failed checks).",
          created: 0,
          updated: 0,
          skipped: [],
          errors: [],
        });
      }
      const { data: importData, error: importError } = await supabase.rpc(
        "admin_import_trainer_question_drafts",
        { p_questions: drafts },
      );
      if (importError) {
        return json({ error: importError.message }, 500);
      }
      const created = typeof importData?.created === "number" ? importData.created : 0;
      const updated = typeof importData?.updated === "number" ? importData.updated : 0;
      return json({
        ok: true,
        phase: "import",
        log: `Saved to Review Queue: ${created} created, ${updated} updated.`,
        created,
        updated,
        skipped: Array.isArray(importData?.skipped) ? importData.skipped : [],
        errors: Array.isArray(importData?.errors) ? importData.errors : [],
      });
    }

    // Full pipeline (legacy single call)
    const {
      drafts,
      outcomes,
      generated,
      importedLegacyIds,
      repairAttempted,
      repairSucceeded,
    } = await generateAndVerifyQuestions(processInput);

    let importResult = {
      created: 0,
      updated: 0,
      skipped: [] as string[],
      errors: [] as string[],
    };

    if (drafts.length > 0) {
      const { data: importData, error: importError } = await supabase.rpc(
        "admin_import_trainer_question_drafts",
        { p_questions: drafts },
      );
      if (importError) {
        return json({ error: importError.message }, 500);
      }
      importResult = {
        created: typeof importData?.created === "number" ? importData.created : 0,
        updated: typeof importData?.updated === "number" ? importData.updated : 0,
        skipped: Array.isArray(importData?.skipped) ? importData.skipped : [],
        errors: Array.isArray(importData?.errors) ? importData.errors : [],
      };
    }

    const result = summariseGenerateResult(
      generated,
      outcomes,
      importResult,
      importedLegacyIds,
      repairAttempted,
      repairSucceeded,
    );

    return json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return json({ error: message }, 500);
  }
});
