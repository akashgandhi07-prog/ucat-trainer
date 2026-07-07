import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  deleteTrainerQuestion,
  deleteTrainerQuestions,
  formatBulkDeleteMessage,
  isDeletableQuestion,
} from "../../../lib/questionLabDelete";
import { saveTrainerQuestionEdit, type QuestionEditPatch } from "../../../lib/questionLabEdit";
import {
  type GetQuestionsResult,
  type QuestionRow,
  DIFFICULTIES,
  QUALITIES,
  QUALITY_BADGE,
  SECTIONS,
  STATUS_BADGE,
  STATUSES,
  TRAINER_TYPES,
  downloadCsv,
  errorMessage,
  trainerQuestionsArgs,
  withAdminActionTimeout,
  withAdminRpcTimeout,
  withAuthSessionRetry,
} from "./shared";
import {
  BulkDeleteBar,
  DeletableCheckbox,
  ExpandedQuestion,
  SectionSelectAll,
  badge,
  useQuestionSelection,
} from "./components";

export default function QuestionsTab() {
  const [section, setSection]         = useState("");
  const [trainerType, setTrainerType] = useState("");
  const [status, setStatus]           = useState("");
  const [quality, setQuality]         = useState("");
  const [difficulty, setDifficulty]   = useState("");
  const [flagged, setFlagged]         = useState("");
  const [search, setSearch]           = useState("");

  const [rows, setRows]               = useState<QuestionRow[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage]               = useState(0);
  const PAGE_SIZE = 50;
  const selection = useQuestionSelection();
  const bulkDeleting = actionLoading === "bulk-delete";

  const load = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await withAuthSessionRetry<GetQuestionsResult>(() =>
        supabase.rpc(
          "admin_get_trainer_questions",
          trainerQuestionsArgs({
            section,
            trainerType,
            status,
            quality,
            difficulty,
            flagged: flagged === "yes" ? true : flagged === "no" ? false : null,
            search,
            limit: PAGE_SIZE,
            offset: pageNum * PAGE_SIZE,
          }),
        ),
      );
      if (rpcError) throw rpcError;
      const result = data as GetQuestionsResult;
      setRows(result.rows ?? []);
      setTotal(result.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      setError(errorMessage(err, "Failed to load questions."));
    } finally {
      setLoading(false);
    }
  }, [section, trainerType, status, quality, difficulty, flagged, search]);

  useEffect(() => { load(0); }, [load]);

  useEffect(() => {
    const visible = new Set(rows.map((r) => r.id));
    selection.setSelectedMany(
      [...selection.selectedIds].filter((id) => !visible.has(id)),
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds].filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isDeletableQuestion(row.status);
    });
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} question${ids.length !== 1 ? "s" : ""} permanently? Related reports and review history will be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    setActionLoading("bulk-delete");
    setActionError(null);
    try {
      const result = await withAdminActionTimeout(
        () => deleteTrainerQuestions(ids),
        "Bulk delete",
      );
      const bulkMessage = formatBulkDeleteMessage(result);
      if (bulkMessage) setActionError(bulkMessage);
      selection.clearSelection();
      setExpandedId(null);
    } catch (e) {
      setActionError(errorMessage(e, "Bulk delete failed."));
    } finally {
      setActionLoading(null);
    }
    void load(page);
  };

  const handleActivate = async (id: string) => {
    setActionLoading(`activate:${id}`);
    setActionError(null);
    try {
      const { error: err } = await withAdminRpcTimeout(
        () => supabase.rpc("admin_update_question_status", { p_id: id, p_status: "active" }),
        "Activate",
      );
      if (err) {
        setActionError(err.message);
        return;
      }
      await load(page);
    } catch (e) {
      setActionError(errorMessage(e, "Activate failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (id: string) => {
    setActionLoading(`archive:${id}`);
    setActionError(null);
    try {
      const { error: err } = await withAdminRpcTimeout(
        () => supabase.rpc("admin_update_question_status", { p_id: id, p_status: "archived" }),
        "Archive",
      );
      if (err) {
        setActionError(err.message);
        return;
      }
      await load(page);
    } catch (e) {
      setActionError(errorMessage(e, "Archive failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(`duplicate:${id}`);
    setActionError(null);
    try {
      const { data, error: err } = await withAdminRpcTimeout<{ new_id?: string }>(
        () => supabase.rpc("admin_duplicate_question_as_draft", { p_id: id }),
        "Duplicate as draft",
      );
      if (err) {
        setActionError(err.message);
        return;
      }
      const newId = data?.new_id;
      await load(page);
      if (newId) setExpandedId(newId);
    } catch (e) {
      setActionError(errorMessage(e, "Duplicate as draft failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendToReview = async (id: string) => {
    setActionLoading(`review:${id}`);
    setActionError(null);
    try {
      const { error: err } = await withAdminRpcTimeout(
        () => supabase.rpc("admin_send_question_to_review_queue", { p_id: id }),
        "Send to review queue",
      );
      if (err) {
        setActionError(err.message);
        return;
      }
      setExpandedId(null);
      await load(page);
    } catch (e) {
      setActionError(errorMessage(e, "Send to review queue failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const target = rows.find((r) => r.id === id);
    if (!target || !isDeletableQuestion(target.status)) {
      setActionError("Only drafts and archived questions can be deleted.");
      return;
    }
    if (
      !window.confirm(
        "Delete this question permanently? Related reports and review history will be removed. This cannot be undone.",
      )
    ) {
      return;
    }
    setActionLoading(`delete:${id}`);
    setActionError(null);
    try {
      await withAdminActionTimeout(() => deleteTrainerQuestion(id), "Delete");
      selection.setSelectedMany([id], false);
      setExpandedId(null);
      await load(page);
    } catch (e) {
      setActionError(errorMessage(e, "Delete failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (id: string, patch: QuestionEditPatch) => {
    const target = rows.find((r) => r.id === id);
    setActionLoading(`save:${id}`);
    setActionError(null);
    try {
      await withAdminActionTimeout(
        () =>
          saveTrainerQuestionEdit(
            id,
            patch,
            target?.status === "active",
            target?.question_kind ?? "mcq",
          ),
        "Save",
      );
      await load(page);
    } catch (e) {
      setActionError(errorMessage(e, "Save failed."));
      throw e;
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-600">
          <Filter className="w-4 h-4" />
          Filters
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">All sections</option>
            {SECTIONS.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select
            value={trainerType}
            onChange={(e) => setTrainerType(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">All trainer types</option>
            {TRAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">All quality</option>
            {QUALITIES.map((q) => <option key={q} value={q}>{q.replace("_", " ")}</option>)}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">All difficulties</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={flagged}
            onChange={(e) => setFlagged(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">Flagged: any</option>
            <option value="yes">Flagged only</option>
            <option value="no">Not flagged</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stem, skill tag, legacy ID…"
              className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded text-sm bg-white text-zinc-800 placeholder:text-zinc-400"
            />
          </div>
          <button
            onClick={() => { setSection(""); setTrainerType(""); setStatus(""); setQuality(""); setDifficulty(""); setFlagged(""); setSearch(""); }}
            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
          <button
            onClick={() => load(0)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </button>
          {rows.length > 0 && (
            <button
              onClick={() => downloadCsv(rows, `questions-${Date.now()}.csv`)}
              className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {(error || actionError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error || actionError}
        </div>
      )}

      {/* Summary */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            {total} question{total !== 1 ? "s" : ""} matching filters
            {total > PAGE_SIZE && ` · page ${page + 1} of ${totalPages}`}
          </p>
          {rows.some((r) => isDeletableQuestion(r.status)) && (
            <SectionSelectAll
              rows={rows}
              selectedIds={selection.selectedIds}
              onToggleAll={selection.setSelectedMany}
              disabled={!!actionLoading}
            />
          )}
        </div>
      )}

      <BulkDeleteBar
        selectedCount={selection.selectedCount}
        busy={bulkDeleting}
        onClear={selection.clearSelection}
        onDelete={handleBulkDelete}
      />

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">No questions found.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              const canSelect = isDeletableQuestion(row.status);
              return (
                <div key={row.id}>
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors">
                    {canSelect ? (
                      <DeletableCheckbox
                        checked={selection.isSelected(row.id)}
                        disabled={!!actionLoading}
                        onChange={() => selection.toggleSelected(row.id)}
                      />
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {badge(STATUS_BADGE[row.status] ?? "bg-zinc-100 text-zinc-600", row.status)}
                          {badge(QUALITY_BADGE[row.quality_status] ?? "bg-zinc-100 text-zinc-600", row.quality_status.replace("_", " "))}
                          <span className="text-xs text-zinc-400">{row.trainer_type}</span>
                          <span className="text-xs text-zinc-400">·</span>
                          <span className="text-xs text-zinc-400">{row.difficulty}</span>
                          {row.skill_tag && (
                            <>
                              <span className="text-xs text-zinc-400">·</span>
                              <span className="text-xs text-zinc-500">{row.skill_tag}</span>
                            </>
                          )}
                          {row.is_flagged && (
                            <span className="text-xs text-red-500 font-medium">⚑ {row.flag_count}</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-800 truncate">
                          {row.stem || (row.content as Record<string,unknown>).question as string || "n/a"}
                        </p>
                        {row.legacy_id && (
                          <p className="text-xs text-zinc-400 font-mono">{row.legacy_id}</p>
                        )}
                      </div>
                    </button>
                    <div className="shrink-0 text-zinc-400 mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <ExpandedQuestion
                      row={row}
                      onActivate={handleActivate}
                      onArchive={handleArchive}
                      onDuplicate={handleDuplicate}
                      onSendToReview={handleSendToReview}
                      onDelete={handleDelete}
                      onSaveEdit={handleSaveEdit}
                      actionLoading={actionLoading}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => load(page - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 border border-zinc-200 rounded text-sm disabled:opacity-40 hover:bg-zinc-50"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-3 py-1.5 border border-zinc-200 rounded text-sm disabled:opacity-40 hover:bg-zinc-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
