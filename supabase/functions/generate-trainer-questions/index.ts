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
import {
  generateAndVerifyQuestions,
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
  trainerType?: string;
  count?: number;
  skillTag?: string;
  difficulty?: string;
  outputSpec?: string;
  goldStandard?: string;
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

  try {
    const {
      drafts,
      outcomes,
      generated,
      importedLegacyIds,
      repairAttempted,
      repairSucceeded,
    } = await generateAndVerifyQuestions({
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
    });

    let importResult = {
      created: 0,
      updated: 0,
      skipped: [] as string[],
      errors: [] as string[],
    };

    if (drafts.length > 0) {
      const { data: importData, error: importError } = await supabase.rpc(
        "admin_import_trainer_question_drafts",
        { p_questions: drafts }
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
      repairSucceeded
    );

    return json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return json({ error: message }, 500);
  }
});
