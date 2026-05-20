import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  QUESTION_LAB_TRAINER_TYPES,
  TRAINER_META,
  countOfficialExamples,
  fetchOfficialExamplesFromApi,
  fetchOutputSpecFromApi,
  formatCurrentBankForAi,
} from "../../lib/questionLabAssets";
import { loadTrainerBankForExport } from "../../lib/questionLabBankExport";
import {
  IMPORT_BATCH_SIZE,
  importDraftsToDatabase,
  parseImportJson,
  type ImportRpcResult,
} from "../../lib/questionLabImport";
import { invokeGenerateTrainerQuestionsPhased } from "../../lib/questionLabGenerateInvoke";
import { buildAuditPrompt, buildGenerationPrompt } from "../../lib/questionLabPrompts";

type CopyKey = "official" | "output" | "prompt" | "audit" | "bank";
type BankStatus = "" | "active" | "draft";

async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard not available in this browser.");
  }
  await navigator.clipboard.writeText(text);
}

function CopyBtn({
  label,
  sub,
  onClick,
  loading,
  copied,
  disabled,
  variant = "default",
}: {
  label: string;
  sub?: string;
  onClick: () => void;
  loading: boolean;
  copied: boolean;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  const base =
    variant === "primary"
      ? "bg-black text-white border-black hover:bg-zinc-800"
      : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-3 py-2 rounded border text-sm disabled:opacity-50 ${base}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : copied ? (
        <Check className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <ClipboardCopy className="w-4 h-4 shrink-0" />
      )}
      <span className="text-left">
        {label}
        {sub ? <span className="block text-xs font-normal opacity-70">{sub}</span> : null}
      </span>
    </button>
  );
}

export default function QuestionLabWorkflow() {
  const [trainerType, setTrainerType] = useState("venn-logic");
  const [bankStatus, setBankStatus] = useState<BankStatus>("active");
  const [copied, setCopied] = useState<CopyKey | null>(null);
  const [loading, setLoading] = useState<CopyKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [officialStats, setOfficialStats] = useState<{
    count: number;
    isEmpty: boolean;
    wordCount: number;
  } | null>(null);
  const [bankHint, setBankHint] = useState<string | null>(null);
  const [importJson, setImportJson] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof parseImportJson> | null>(
    null,
  );
  const [importResult, setImportResult] = useState<ImportRpcResult | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateLog, setGenerateLog] = useState<string[]>([]);
  const [generateResult, setGenerateResult] = useState<{
    created: number;
    updated: number;
    flagged: number;
    failed: number;
    generated: number;
    hint?: string;
    repairAttempted?: number;
    repairSucceeded?: number;
    questions?: Array<{
      legacy_id: string;
      quality_status: string;
      quality_notes: string;
      imported?: boolean;
    }>;
  } | null>(null);
  const [generateReportOpen, setGenerateReportOpen] = useState(false);
  const [skillTagFilter, setSkillTagFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  const meta = TRAINER_META[trainerType];

  const flash = (key: CopyKey) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
  };

  useEffect(() => {
    let cancelled = false;
    void fetchOfficialExamplesFromApi(trainerType).then((md) => {
      if (cancelled || !md) return;
      const stats = countOfficialExamples(md);
      setOfficialStats({
        count: stats.count,
        isEmpty: stats.isEmpty,
        wordCount: stats.wordCount,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [trainerType]);

  useEffect(() => {
    setImportPreview(null);
    setImportResult(null);
    setImportJson("");
    setGenerateResult(null);
    setSkillTagFilter("");
    setDifficultyFilter("");
  }, [trainerType]);

  const handleGenerateDrafts = useCallback(async () => {
    if (!meta?.supportsGenerate) return;
    setGenerateBusy(true);
    setError(null);
    setGenerateResult(null);
    setGenerateLog([]);
    try {
      const [goldStandard, outputSpec] = await Promise.all([
        fetchOfficialExamplesFromApi(trainerType),
        fetchOutputSpecFromApi(trainerType),
      ]);
      if (!goldStandard?.trim()) throw new Error("No official examples file found.");
      if (!outputSpec?.trim()) throw new Error("No output format file found.");
      const stats = countOfficialExamples(goldStandard);
      if (stats.isEmpty) {
        throw new Error(
          "Official examples look empty. Add UCAT questions below the line in Official examples first.",
        );
      }

      const result = await invokeGenerateTrainerQuestionsPhased(
        {
          trainerType,
          count: 5,
          skillTag: skillTagFilter.trim() || undefined,
          difficulty: difficultyFilter.trim() || undefined,
          outputSpec,
          goldStandard,
        },
        {
          onLog: (line) => {
            setGenerateLog((prev) => [...prev, line]);
          },
        },
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      setGenerateResult({
        created: result.created,
        updated: result.updated,
        flagged: result.flagged,
        failed: result.failed,
        generated: result.generated,
        hint: result.hint,
        repairAttempted: result.repairAttempted,
        repairSucceeded: result.repairSucceeded,
        questions: result.questions,
      });
      setGenerateLog((prev) => [
        ...prev,
        `Finished: ${result.created + result.updated} draft(s) in Review Queue.`,
      ]);
      setGenerateReportOpen(true);
      if (result.imported === 0 && result.generated > 0) {
        setError(
          result.hint ??
            "No questions imported. Expand the report below to see Blocked vs Review wording.",
        );
      } else {
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setError(message);
      setGenerateLog((prev) => [...prev, `Error: ${message}`]);
    } finally {
      setGenerateBusy(false);
    }
  }, [trainerType, meta?.supportsGenerate, skillTagFilter, difficultyFilter]);

  const handleCopyOfficial = useCallback(async () => {
    setLoading("official");
    setError(null);
    try {
      const text = await fetchOfficialExamplesFromApi(trainerType);
      if (!text?.trim()) throw new Error("No official examples file found.");
      const stats = countOfficialExamples(text);
      if (stats.isEmpty) {
        throw new Error(
          `Official examples look empty (${stats.wordCount} words after the divider). Add UCAT questions below the line in Official examples, then save.`,
        );
      }
      await copyText(text);
      flash("official");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed.");
    } finally {
      setLoading(null);
    }
  }, [trainerType]);

  const handleCopyOutput = useCallback(async () => {
    setLoading("output");
    setError(null);
    try {
      const text = await fetchOutputSpecFromApi(trainerType);
      if (!text?.trim()) throw new Error("No output format file found.");
      await copyText(text);
      flash("output");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed.");
    } finally {
      setLoading(null);
    }
  }, [trainerType]);

  const handleCopyPrompt = useCallback(async () => {
    setLoading("prompt");
    setError(null);
    try {
      await copyText(buildGenerationPrompt(meta?.label ?? trainerType));
      flash("prompt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed.");
    } finally {
      setLoading(null);
    }
  }, [trainerType, meta?.label]);

  const handleCopyAudit = useCallback(async () => {
    setLoading("audit");
    setError(null);
    try {
      await copyText(buildAuditPrompt(meta?.label ?? trainerType));
      flash("audit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed.");
    } finally {
      setLoading(null);
    }
  }, [trainerType, meta?.label]);

  const handleCopyBank = useCallback(async () => {
    setLoading("bank");
    setError(null);
    try {
      const { rows, sourceLabel } = await loadTrainerBankForExport(trainerType, bankStatus);
      if (rows.length === 0) {
        throw new Error(
          "No questions to copy. Seed the database or pick a trainer with a local bank (DM, SJT, Conversions).",
        );
      }
      await copyText(formatCurrentBankForAi(trainerType, rows, { sourceLabel }));
      setBankHint(sourceLabel);
      flash("bank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copy failed.");
    } finally {
      setLoading(null);
    }
  }, [trainerType, bankStatus]);

  const handlePreviewImport = () => {
    setImportResult(null);
    const result = parseImportJson(importJson, trainerType);
    setImportPreview(result);
    if (!result.ok) setError(result.message);
    else setError(null);
  };

  const handleImport = async () => {
    setImportResult(null);
    setImportProgress(null);
    setImportBusy(true);
    setError(null);

    try {
      let parsed: ReturnType<typeof parseImportJson>;
      try {
        parsed = parseImportJson(importJson, trainerType);
      } catch {
        setImportPreview({ ok: false, message: "Invalid JSON. Check the array is complete and valid." });
        setError("Invalid JSON. Check the array is complete and valid.");
        return;
      }

      if (!parsed.ok) {
        setImportPreview(parsed);
        setError(parsed.message);
        return;
      }

      setImportPreview(parsed);
      const batchCount = Math.ceil(parsed.items.length / IMPORT_BATCH_SIZE);
      setImportProgress(`Importing 0 of ${parsed.items.length} (${batchCount} batch${batchCount === 1 ? "" : "es"})…`);

      const result = await importDraftsToDatabase(parsed.items, (done, total) => {
        const batches = Math.ceil(total / IMPORT_BATCH_SIZE);
        const batchDone = Math.ceil(done / IMPORT_BATCH_SIZE);
        setImportProgress(
          `Importing ${done} of ${total} (batch ${batchDone} of ${batches})…`,
        );
      });

      setImportResult(result);
      if (result.created + result.updated === 0 && result.errors.length === 0) {
        setError("Nothing imported. Active questions were skipped (duplicate as draft to replace).");
      } else if (result.errors.length > 0) {
        setError(
          `Imported ${result.created + result.updated}, but ${result.errors.length} row(s) had errors. Check console or try Preview.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
      setImportProgress(null);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="bg-white border border-zinc-200 rounded-lg p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Write questions with AI</h2>
          <p className="text-sm text-zinc-600 mt-1 max-w-3xl">
            Generate drafts in one click (OpenRouter), or use the manual ChatGPT copy and paste flow
            below. Both create drafts only. Activate from Review Queue.
          </p>
        </div>

        {meta?.supportsGenerate ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-violet-900 uppercase tracking-wide">
              One-click generate (admin)
            </p>
            <p className="text-sm text-violet-950/80">
              Generates drafts, auto-fixes small copy issues, then sends blocked or flagged
              questions through one AI repair batch (except proven maths errors). Requires the
              Edge Function and OPENROUTER_API_KEY.
            </p>
            <p className="text-xs text-violet-800/90">
              Uses the <strong>Trainer</strong> selected below (e.g. DM · Venn Logic). Usually takes
              2 to 4 minutes; keep this tab open until the spinner stops.
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-violet-900">Skill tag (optional)</span>
                <input
                  type="text"
                  value={skillTagFilter}
                  onChange={(e) => setSkillTagFilter(e.target.value)}
                  placeholder="e.g. two-set-find-overlap"
                  className="border border-violet-200 rounded px-3 py-2 bg-white min-w-[200px]"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-violet-900">Difficulty (optional)</span>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="border border-violet-200 rounded px-3 py-2 bg-white min-w-[140px]"
                >
                  <option value="">Any</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleGenerateDrafts()}
                disabled={generateBusy || officialStats?.isEmpty}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-violet-900 text-white text-sm font-medium hover:bg-violet-800 disabled:opacity-50"
              >
                {generateBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generateBusy ? "Running pipeline…" : "Generate 5 drafts"}
              </button>
            </div>
            {(generateBusy || generateLog.length > 0) && (
              <div
                className="rounded border border-violet-200 bg-white/90 px-3 py-2 max-h-40 overflow-y-auto"
                aria-live="polite"
                aria-busy={generateBusy}
              >
                <p className="text-xs font-semibold text-violet-900 mb-1.5">Progress log</p>
                {generateLog.length === 0 ? (
                  <p className="text-xs text-violet-800/80">Waiting for first step…</p>
                ) : (
                  <ol className="text-xs text-violet-950 space-y-1 list-decimal list-inside">
                    {generateLog.map((line, i) => (
                      <li key={`${i}-${line.slice(0, 24)}`} className="leading-snug">
                        {line}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
            {generateResult && (
              <div className="space-y-2">
                <p
                  className={`text-sm rounded px-3 py-2 border ${
                    generateResult.created + generateResult.updated > 0
                      ? "text-green-900 bg-green-50 border-green-200"
                      : "text-amber-900 bg-amber-50 border-amber-200"
                  }`}
                >
                  Generated {generateResult.generated} · Imported{" "}
                  {generateResult.created + generateResult.updated} draft
                  {generateResult.created + generateResult.updated === 1 ? "" : "s"}
                  {generateResult.flagged > 0 && (
                    <span> · {generateResult.flagged} flagged for review</span>
                  )}
                  {generateResult.failed > 0 && (
                    <span> · {generateResult.failed} blocked (not imported)</span>
                  )}
                  {(generateResult.repairAttempted ?? 0) > 0 && (
                    <span>
                      {" "}
                      · AI repair fixed {generateResult.repairSucceeded ?? 0} of{" "}
                      {generateResult.repairAttempted}
                    </span>
                  )}
                  . Open <strong>Review Queue</strong> to edit or activate.
                </p>
                {generateResult.hint && (
                  <p className="text-xs text-zinc-600">{generateResult.hint}</p>
                )}
                {generateResult.questions && generateResult.questions.length > 0 && (
                  <details
                    open={generateReportOpen}
                    onToggle={(e) => setGenerateReportOpen(e.currentTarget.open)}
                    className="text-sm border border-zinc-200 rounded bg-white"
                  >
                    <summary className="cursor-pointer px-3 py-2 font-medium text-zinc-800">
                      Per-question report
                    </summary>
                    <ul className="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                      {generateResult.questions.map((q) => (
                        <li
                          key={q.legacy_id}
                          className="text-xs border border-zinc-100 rounded p-2 bg-zinc-50"
                        >
                          <span className="font-mono font-medium">{q.legacy_id}</span>
                          {" · "}
                          <span
                            className={
                              q.quality_status === "fail"
                                ? "text-red-700"
                                : q.quality_status === "needs_review"
                                  ? "text-amber-800"
                                  : "text-green-800"
                            }
                          >
                            {q.quality_status.replace("_", " ")}
                            {q.imported ? " · imported" : " · not imported"}
                          </span>
                          {q.quality_notes ? (
                            <p className="mt-1 text-zinc-600">{q.quality_notes}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Trainer</span>
            <select
              value={trainerType}
              onChange={(e) => setTrainerType(e.target.value)}
              className="border border-zinc-200 rounded px-3 py-2 bg-white text-zinc-900 min-w-[220px]"
            >
              {QUESTION_LAB_TRAINER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TRAINER_META[t]?.label ?? t}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              to="/admin/question-lab/gold-standards"
              className="inline-flex items-center gap-1 px-3 py-2 border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50"
            >
              Edit official examples
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              to="/admin/question-lab/output-specs"
              className="inline-flex items-center gap-1 px-3 py-2 border border-zinc-200 rounded text-zinc-700 hover:bg-zinc-50"
            >
              Edit output format
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {officialStats?.isEmpty ? (
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Step 1 not done yet.</strong> Open{" "}
              <Link to="/admin/question-lab/gold-standards" className="underline">
                Official examples
              </Link>{" "}
              and paste real UCAT questions below the line before copying to ChatGPT.
            </p>
          </div>
        ) : officialStats ? (
          <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded px-3 py-2">
            Official examples look ready ({officialStats.wordCount.toLocaleString()} words
            {officialStats.count > 0 ? ` · ~${officialStats.count} example${officialStats.count === 1 ? "" : "s"}` : ""}
            ). You can copy to ChatGPT.
          </p>
        ) : null}

        {/* Step 1–3 · manual ChatGPT flow */}
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Manual flow (ChatGPT copy and paste)
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-zinc-200 p-3 space-y-2 bg-zinc-50/50">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Step 1 · ChatGPT learns from UCAT</p>
            <p className="text-sm text-zinc-600">Copy official questions into ChatGPT first.</p>
            <CopyBtn
              label="Copy official examples"
              sub="From your MD file"
              onClick={handleCopyOfficial}
              loading={loading === "official"}
              copied={copied === "official"}
            />
          </section>

          <section className="rounded-lg border border-zinc-200 p-3 space-y-2 bg-zinc-50/50">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Step 2 · Our product format</p>
            <p className="text-sm text-zinc-600">Copy how we explain and structure questions.</p>
            <div className="flex flex-col gap-2">
              <CopyBtn
                label="Copy output format"
                sub="JSON shape + rules"
                onClick={handleCopyOutput}
                loading={loading === "output"}
                copied={copied === "output"}
              />
              <CopyBtn
                label="Copy generation prompt"
                sub="Instructions for ChatGPT"
                onClick={handleCopyPrompt}
                loading={loading === "prompt"}
                copied={copied === "prompt"}
                variant="primary"
              />
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 p-3 space-y-2 bg-zinc-50/50">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Step 3 · Optional audit</p>
            <p className="text-sm text-zinc-600">Copy what you already have to check for gaps.</p>
            <select
              value={bankStatus}
              onChange={(e) => setBankStatus(e.target.value as BankStatus)}
              className="w-full border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white mb-2"
            >
              <option value="active">Active questions only</option>
              <option value="draft">Drafts only</option>
              <option value="">All statuses</option>
            </select>
            <div className="flex flex-col gap-2">
              <CopyBtn
                label="Copy current bank"
                sub={bankHint ?? "Database + local files"}
                onClick={handleCopyBank}
                loading={loading === "bank"}
                copied={copied === "bank"}
              />
              <CopyBtn
                label="Copy audit prompt"
                sub="For reviewing the bank"
                onClick={handleCopyAudit}
                loading={loading === "audit"}
                copied={copied === "audit"}
              />
            </div>
          </section>
        </div>

        <details className="text-sm text-zinc-600 bg-zinc-50 rounded border border-zinc-100 px-3 py-2">
          <summary className="cursor-pointer font-medium text-zinc-700">What do I paste into ChatGPT?</summary>
          <ol className="list-decimal list-inside mt-2 space-y-1 pl-1">
            <li>Paste <strong>generation prompt</strong> (or write: “I will send 3 blocks”).</li>
            <li>Paste <strong>official examples</strong>.</li>
            <li>Paste <strong>output format</strong>. Ask for 5–10 new questions, JSON only.</li>
            <li>Optional: paste <strong>current bank</strong> + <strong>audit prompt</strong> to review.</li>
          </ol>
        </details>

        {/* Step 4 Import */}
        <div className="border-t border-zinc-200 pt-4">
          <button
            type="button"
            onClick={() => setImportOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-900"
          >
            {importOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Step 4 · Paste ChatGPT JSON back here
          </button>

          {importOpen && (
            <div className="mt-3 space-y-3">
              {!meta?.supportsImport ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
                  {meta?.importHint ?? "Import is not available for this trainer yet."}
                </p>
              ) : (
                <>
                  <p className="text-sm text-zinc-600">
                    Paste the JSON array from ChatGPT (e.g. 20 questions in one{" "}
                    <code className="text-xs bg-zinc-100 px-1 rounded">[...]</code> array). We create{" "}
                    <strong>drafts</strong> only, in batches of {IMPORT_BATCH_SIZE}. Review them in the Review Queue
                    tab, then Activate.
                  </p>
                  <textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    rows={8}
                    placeholder='[{"id":"venn-new-001","trainerType":"venn-logic",...}]'
                    className="w-full border border-zinc-200 rounded p-3 text-sm font-mono text-zinc-800"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewImport}
                      className="px-3 py-2 text-sm border border-zinc-200 rounded hover:bg-zinc-50"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importBusy || !importJson.trim()}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm bg-black text-white rounded hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {importBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {importBusy && importProgress ? importProgress : "Import as drafts"}
                    </button>
                  </div>
                  {importBusy && importProgress && (
                    <p className="text-xs text-zinc-500">{importProgress}</p>
                  )}

                  {importPreview?.ok && (
                    <div className="text-sm text-zinc-700">
                      <p className="font-medium text-green-800">
                        Ready to import {importPreview.preview.length} question
                        {importPreview.preview.length === 1 ? "" : "s"}:
                      </p>
                      <ul className="mt-1 max-h-32 overflow-y-auto text-xs font-mono text-zinc-600 space-y-0.5">
                        {importPreview.preview.map((p) => (
                          <li key={p.legacy_id}>
                            {p.legacy_id} · {p.skill_tag} · {p.difficulty}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importPreview && !importPreview.ok && importPreview.details?.length ? (
                    <ul className="text-xs text-red-700 space-y-0.5 max-h-28 overflow-y-auto">
                      {importPreview.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : null}

                  {importResult && (
                    <div className="text-sm p-3 bg-green-50 border border-green-200 rounded text-green-900">
                      Created {importResult.created}, updated {importResult.updated} draft
                      {importResult.skipped.length > 0 && (
                        <span>, skipped {importResult.skipped.length} (already active)</span>
                      )}
                      . Open <strong>Review Queue</strong> to activate.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
