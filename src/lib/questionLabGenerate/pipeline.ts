import { mapRawQuestionForImport, type ImportDraftPayload } from "../questionLabMapImport.ts";
import { applyAuditAccuracyCaps, parseAuditVerdict } from "./audit.ts";
import { buildAuditMessages, buildGenerateMessages, buildRepairMessages } from "./prompts.ts";
import { callOpenRouter, type OpenRouterConfig } from "./openrouter.ts";
import { eligibleForAiRepair, repairIssuesForPrompt } from "./repair.ts";
import { pluginContextLine, runPlugins } from "./plugins/index.ts";
import { getGenerateProfile } from "./profiles.ts";
import type {
  AuditVerdict,
  GenerateTrainerQuestionsResult,
  QuestionVerifyOutcome,
  TrainerGenerateProfile,
} from "./types.ts";
import { autoFixGeneratedRaw } from "./autoFix.ts";
import { parseAiJsonArray, asRecord, normaliseStemKey, str } from "./utils.ts";
import { validateUniversal } from "./validateUniversal.ts";

export type ProcessGeneratedInput = {
  trainerType: string;
  outputSpec: string;
  goldStandard: string;
  count?: number;
  skillTag?: string;
  difficulty?: string;
  existingStems?: string[];
  openRouter: OpenRouterConfig;
  skipAudit?: boolean;
};

type VerifyContext = {
  input: ProcessGeneratedInput;
  profile: TrainerGenerateProfile;
  stemKeys: Set<string>;
  legacyIdsInBatch: Set<string>;
};

type VerifyResult = {
  outcome: QuestionVerifyOutcome;
  draft: ImportDraftPayload | null;
  raw: Record<string, unknown>;
};

async function auditQuestion(
  config: OpenRouterConfig,
  profile: TrainerGenerateProfile,
  outputSpec: string,
  raw: Record<string, unknown>,
  pluginSummary: string,
): Promise<AuditVerdict> {
  const messages = buildAuditMessages({
    profile,
    outputSpec,
    questionJson: JSON.stringify(raw, null, 0),
    pluginSummary,
  });
  const rawAudit = await callOpenRouter(config, config.auditModel, messages, 2_000);
  return parseAuditVerdict(rawAudit);
}

async function verifyRawQuestion(
  ctx: VerifyContext,
  raw: Record<string, unknown>,
  repairPass?: number,
): Promise<VerifyResult> {
  const { input, profile, stemKeys, legacyIdsInBatch } = ctx;
  const { fixes: autoFixes } = autoFixGeneratedRaw(raw, profile);

  const legacyId = str(raw.legacy_id) || str(raw.id) || "unknown";
  const layer1Result = validateUniversal(raw, profile, stemKeys, legacyIdsInBatch);
  const layer1 = layer1Result.hard;
  const layer1Soft = layer1Result.soft;
  const layer2 = runPlugins(raw, profile);
  const pluginSummary = pluginContextLine(layer2, profile);

  let layer3: AuditVerdict | null = null;
  if (!input.skipAudit) {
    try {
      layer3 = await auditQuestion(
        input.openRouter,
        profile,
        input.outputSpec,
        raw,
        pluginSummary,
      );
    } catch (err) {
      layer3 = {
        verdict: "needs_review",
        issues: [err instanceof Error ? err.message : "Audit call failed."],
        accuracyPercent: 0,
      };
    }
  } else {
    layer3 = { verdict: "pass", issues: [], accuracyPercent: 100 };
  }

  if (layer3) {
    layer3 = applyAuditAccuracyCaps(layer3, {
      layer1Hard: layer1,
      layer1Soft,
      layer2,
    });
  }

  const hardFail =
    layer1.length > 0 || (layer2?.hardFail === true && layer2.ok === false);

  const accuracy = layer3?.accuracyPercent ?? 0;
  let qualityStatus: "pass" | "needs_review" | "fail" = "pass";
  if (hardFail) qualityStatus = "fail";
  else if (accuracy === 100) qualityStatus = "pass";
  else qualityStatus = "needs_review";

  const auditRationale =
    layer3.issues.length > 0
      ? layer3.issues.join("; ")
      : accuracy === 100
        ? "No issues listed."
        : "Audit flagged for review.";

  const notes: string[] = [
    `Audit ${accuracy}%: ${auditRationale}`,
  ];
  if (repairPass) notes.push(`AI repair pass ${repairPass}`);
  if (autoFixes.length) notes.push(`Auto-fixed: ${autoFixes.join(", ")}`);
  if (layer1.length) notes.push(`Blocked: ${layer1.join("; ")}`);
  if (layer1Soft.length) notes.push(`Review wording: ${layer1Soft.join("; ")}`);
  if (layer2 && !layer2.ok) notes.push(`L2: ${layer2.summary}`);
  if (layer2?.ok && layer2.summary && layer2.verified) notes.push(layer2.summary);

  const baseOutcome: QuestionVerifyOutcome = {
    legacyId,
    hardPass: !hardFail,
    qualityStatus,
    qualityNotes: notes.join(" ") || "AI draft.",
    layer1Issues: [...layer1, ...layer1Soft.map((s) => `(review) ${s}`)],
    layer2,
    layer3,
  };

  if (hardFail) {
    return { outcome: baseOutcome, draft: null, raw };
  }

  const mapped = mapRawQuestionForImport(raw, profile.trainerType);
  if (typeof mapped === "string") {
    return {
      outcome: {
        ...baseOutcome,
        hardPass: false,
        qualityStatus: "fail",
        qualityNotes: `${repairPass ? `AI repair pass ${repairPass}. ` : ""}Mapping: ${mapped}`,
      },
      draft: null,
      raw,
    };
  }

  mapped.quality_status = qualityStatus;
  mapped.quality_notes = baseOutcome.qualityNotes;
  return { outcome: baseOutcome, draft: mapped, raw };
}

function buildVerifyContext(input: ProcessGeneratedInput): VerifyContext {
  const profile = getGenerateProfile(input.trainerType);
  if (!profile) throw new Error("This trainer does not support AI generation yet.");
  return {
    input,
    profile,
    stemKeys: new Set(
      (input.existingStems ?? []).map((s) => normaliseStemKey(s)).filter(Boolean),
    ),
    legacyIdsInBatch: new Set<string>(),
  };
}

function resolveBatchCount(input: ProcessGeneratedInput, profile: TrainerGenerateProfile): number {
  return Math.min(input.count ?? profile.batchSize, profile.batchSize);
}

/** Step 1: single OpenRouter generate call. */
export async function runGeneratePhase(input: ProcessGeneratedInput): Promise<{
  questions: Record<string, unknown>[];
  generated: number;
  count: number;
}> {
  const profile = getGenerateProfile(input.trainerType);
  if (!profile) throw new Error("This trainer does not support AI generation yet.");

  const count = resolveBatchCount(input, profile);
  const generateMessages = buildGenerateMessages({
    profile,
    outputSpec: input.outputSpec,
    goldStandard: input.goldStandard,
    count,
    skillTag: input.skillTag,
    difficulty: input.difficulty,
    bankSnippet: input.existingStems?.length
      ? input.existingStems.slice(0, 30).join("\n")
      : undefined,
  });

  const generatedRaw = await callOpenRouter(
    input.openRouter,
    input.openRouter.generateModel,
    generateMessages,
  );

  const list = parseAiJsonArray(generatedRaw);
  const questions = list
    .slice(0, count)
    .map((item) => asRecord(item))
    .filter((raw): raw is Record<string, unknown> => raw !== null);

  return { questions, generated: list.length, count };
}

/** Step 2: copy/plugins + parallel audit model per question. */
export async function runVerifyPhase(
  input: ProcessGeneratedInput,
  questions: Record<string, unknown>[],
): Promise<{
  outcomes: QuestionVerifyOutcome[];
  drafts: ImportDraftPayload[];
  repairCandidates: Array<{ outcome: QuestionVerifyOutcome; raw: Record<string, unknown> }>;
  generated: number;
}> {
  const ctx = buildVerifyContext(input);
  const outcomes: QuestionVerifyOutcome[] = [];
  const drafts: ImportDraftPayload[] = [];
  const rawByLegacyId = new Map<string, Record<string, unknown>>();

  const verified = await Promise.all(questions.map((raw) => verifyRawQuestion(ctx, raw)));
  for (const result of verified) {
    rawByLegacyId.set(result.outcome.legacyId, result.raw);
    outcomes.push(result.outcome);
    if (result.draft) drafts.push(result.draft);
  }

  const repairCandidates = outcomes
    .filter((o) => eligibleForAiRepair(o))
    .map((o) => ({ outcome: o, raw: rawByLegacyId.get(o.legacyId)! }))
    .filter((c) => Boolean(c.raw));

  return {
    outcomes,
    drafts,
    repairCandidates,
    generated: questions.length,
  };
}

const MAX_REPAIR_PASSES = 2;

/** Step 3: repair batch(es) until 100% accuracy or max passes. */
export async function runRepairPhase(
  input: ProcessGeneratedInput,
  payload: {
    outcomes: QuestionVerifyOutcome[];
    drafts: ImportDraftPayload[];
    repairCandidates: Array<{ outcome: QuestionVerifyOutcome; raw: Record<string, unknown> }>;
  },
): Promise<{
  outcomes: QuestionVerifyOutcome[];
  drafts: ImportDraftPayload[];
  repairAttempted: number;
  repairSucceeded: number;
}> {
  const ctx = buildVerifyContext(input);
  let { outcomes, drafts } = payload;
  let repairCandidates = [...payload.repairCandidates];
  const rawByLegacyId = new Map(
    repairCandidates.map((c) => [c.outcome.legacyId, c.raw] as const),
  );
  for (const o of outcomes) {
    if (!rawByLegacyId.has(o.legacyId)) {
      const match = payload.repairCandidates.find((c) => c.outcome.legacyId === o.legacyId);
      if (match) rawByLegacyId.set(o.legacyId, match.raw);
    }
  }

  let repairAttempted = 0;
  let repairSucceeded = 0;

  for (let pass = 1; pass <= MAX_REPAIR_PASSES && repairCandidates.length > 0; pass++) {
    repairAttempted += repairCandidates.length;
    const repairedList = await runAiRepairBatch(ctx, repairCandidates);

    const repairVerified = await Promise.all(
      repairCandidates.map(async (candidate, i) => {
        const repairedRaw =
          asRecord(repairedList[i]) ??
          repairedList.find(
            (r) =>
              str(r.legacy_id) === candidate.outcome.legacyId ||
              str(r.id) === candidate.outcome.legacyId,
          );

        if (!repairedRaw) return { candidate, result: null as VerifyResult | null };

        if (!str(repairedRaw.legacy_id) && !str(repairedRaw.id)) {
          repairedRaw.legacy_id = candidate.outcome.legacyId;
        }

        rawByLegacyId.set(candidate.outcome.legacyId, repairedRaw);
        const result = await verifyRawQuestion(ctx, repairedRaw, pass);
        return { candidate, result };
      }),
    );

    for (const { candidate, result } of repairVerified) {
      if (!result) continue;

      const idx = outcomes.findIndex((o) => o.legacyId === candidate.outcome.legacyId);
      if (idx >= 0) outcomes[idx] = result.outcome;

      const draftIdx = drafts.findIndex((d) => d.legacy_id === candidate.outcome.legacyId);
      if (result.draft) {
        if (draftIdx >= 0) drafts[draftIdx] = result.draft;
        else drafts.push(result.draft);
        if (result.draft) repairSucceeded += 1;
      } else if (draftIdx >= 0) {
        drafts.splice(draftIdx, 1);
      }
    }

    repairCandidates = outcomes
      .filter((o) => eligibleForAiRepair(o))
      .map((o) => ({
        outcome: o,
        raw: rawByLegacyId.get(o.legacyId)!,
      }))
      .filter((c) => Boolean(c.raw));
  }

  return { outcomes, drafts, repairAttempted, repairSucceeded };
}

async function runAiRepairBatch(
  ctx: VerifyContext,
  candidates: Array<{ raw: Record<string, unknown>; outcome: QuestionVerifyOutcome }>,
): Promise<Record<string, unknown>[]> {
  const items = candidates.map((c) => ({
    legacyId: c.outcome.legacyId,
    raw: c.raw,
    issues: repairIssuesForPrompt(c.outcome),
  }));

  const messages = buildRepairMessages({
    profile: ctx.profile,
    outputSpec: ctx.input.outputSpec,
    items,
  });

  const repairedRaw = await callOpenRouter(
    ctx.input.openRouter,
    ctx.input.openRouter.repairModel,
    messages,
    12_000,
  );

  return parseAiJsonArray(repairedRaw)
    .map((item) => asRecord(item))
    .filter((r): r is Record<string, unknown> => r !== null);
}

/** Full pipeline in one call (used when phase is omitted). */
export async function generateAndVerifyQuestions(
  input: ProcessGeneratedInput,
): Promise<{
  drafts: ImportDraftPayload[];
  outcomes: QuestionVerifyOutcome[];
  generated: number;
  importedLegacyIds: Set<string>;
  repairAttempted: number;
  repairSucceeded: number;
}> {
  const { questions, generated } = await runGeneratePhase(input);
  const verify = await runVerifyPhase(input, questions);
  const repaired = await runRepairPhase(input, verify);

  return {
    drafts: repaired.drafts,
    outcomes: repaired.outcomes,
    generated,
    importedLegacyIds: new Set(repaired.drafts.map((d) => d.legacy_id)),
    repairAttempted: repaired.repairAttempted,
    repairSucceeded: repaired.repairSucceeded,
  };
}

export function summariseGenerateResult(
  generated: number,
  outcomes: QuestionVerifyOutcome[],
  importResult: {
    created: number;
    updated: number;
    skipped: Array<{ legacy_id: string; reason: string }>;
    errors: Array<{ legacy_id?: string | null; message: string }>;
  },
  importedLegacyIds: Set<string>,
  repairAttempted: number,
  repairSucceeded: number,
): GenerateTrainerQuestionsResult {
  const imported = importResult.created + importResult.updated;
  const failed = outcomes.filter((o) => o.qualityStatus === "fail").length;
  const flagged = outcomes.filter((o) => o.qualityStatus === "needs_review").length;

  let hint: string | undefined;
  const below100 = outcomes.filter(
    (o) => importedLegacyIds.has(o.legacyId) && (o.layer3?.accuracyPercent ?? 0) < 100,
  ).length;

  if (imported === 0 && outcomes.length > 0) {
    hint =
      "Nothing imported (all failed hard checks). See accuracy % and rationale below.";
  } else if (below100 > 0) {
    hint = `${imported} imported to Review Queue. ${below100} below 100% accuracy: check those first.`;
  } else if (failed > 0) {
    hint = `${imported} imported. ${failed} blocked (hard fail, not imported).`;
  }
  if (repairAttempted > 0) {
    const repairLine = `Repair: ${repairSucceeded} of ${repairAttempted} produced importable drafts.`;
    hint = hint ? `${hint} ${repairLine}` : repairLine;
  }

  return {
    created: importResult.created,
    updated: importResult.updated,
    skipped: importResult.skipped,
    importErrors: importResult.errors,
    generated,
    imported,
    failed,
    flagged,
    repairAttempted,
    repairSucceeded,
    hint,
    questions: outcomes.map((o) => ({
      legacy_id: o.legacyId,
      quality_status: o.qualityStatus,
      quality_notes: o.qualityNotes,
      accuracy_percent: o.layer3?.accuracyPercent,
      audit_rationale:
        o.layer3?.issues?.length ? o.layer3.issues.join("; ") : undefined,
      imported: importedLegacyIds.has(o.legacyId),
    })),
  };
}
