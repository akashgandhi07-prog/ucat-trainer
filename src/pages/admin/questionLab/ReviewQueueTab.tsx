import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Copy, Loader2, Trash2, Zap } from "lucide-react";
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
  QUALITY_BADGE,
  STATUS_BADGE,
  errorMessage,
  isActionLoading,
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

export default function ReviewQueueTab() {
  const [drafts, setDrafts]     = useState<QuestionRow[]>([]);
  const [needsReview, setNeedsReview] = useState<QuestionRow[]>([]);
  const [flagged, setFlagged]   = useState<QuestionRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const selection = useQuestionSelection();
  const bulkDeleting = actionLoading === "bulk-delete";
  const allQueueRows = useMemo(
    () => [...drafts, ...needsReview, ...flagged],
    [drafts, needsReview, flagged],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, nr, fl] = await Promise.all([
        withAuthSessionRetry<GetQuestionsResult>(() =>
          supabase.rpc(
            "admin_get_trainer_questions",
            trainerQuestionsArgs({ status: "draft", limit: 200, offset: 0 }),
          ),
        ),
        withAuthSessionRetry<GetQuestionsResult>(() =>
          supabase.rpc(
            "admin_get_trainer_questions",
            trainerQuestionsArgs({ quality: "needs_review", limit: 200, offset: 0 }),
          ),
        ),
        withAuthSessionRetry<GetQuestionsResult>(() =>
          supabase.rpc(
            "admin_get_trainer_questions",
            trainerQuestionsArgs({ flagged: true, status: "active", limit: 200, offset: 0 }),
          ),
        ),
      ]);
      if (d.error)  throw d.error;
      if (nr.error) throw nr.error;
      if (fl.error) throw fl.error;
      setDrafts((d.data as GetQuestionsResult).rows ?? []);
      setNeedsReview((nr.data as GetQuestionsResult).rows ?? []);
      setFlagged((fl.data as GetQuestionsResult).rows ?? []);
    } catch (err) {
      setError(errorMessage(err, "Failed to load queue."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const visible = new Set(allQueueRows.map((r) => r.id));
    selection.setSelectedMany(
      [...selection.selectedIds].filter((id) => !visible.has(id)),
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQueueRows]);

  const handleBulkDelete = async () => {
    const ids = [...selection.selectedIds].filter((id) => {
      const row = allQueueRows.find((r) => r.id === id);
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
    void load();
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
      await load();
    } catch (e) {
      setActionError(errorMessage(e, "Activate failed."));
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
      await load();
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
      await load();
    } catch (e) {
      setActionError(errorMessage(e, "Send to review queue failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const target = allQueueRows.find((r) => r.id === id);
    if (!target || !isDeletableQuestion(target.status)) {
      setActionError("Only drafts and archived questions can be deleted. Archive active questions first.");
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
      await load();
    } catch (e) {
      setActionError(errorMessage(e, "Delete failed."));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (id: string, patch: QuestionEditPatch) => {
    const target = allQueueRows.find((r) => r.id === id);
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
      await load();
    } catch (e) {
      setActionError(errorMessage(e, "Save failed."));
      throw e;
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  const Section = ({
    title,
    count,
    color,
    sectionRows,
    children,
  }: {
    title: string;
    count: number;
    color: string;
    sectionRows: QuestionRow[];
    children: React.ReactNode;
  }) => (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>{count}</span>
        </div>
        <SectionSelectAll
          rows={sectionRows}
          selectedIds={selection.selectedIds}
          onToggleAll={selection.setSelectedMany}
          disabled={!!actionLoading}
        />
      </div>
      {count === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-6">None. All clear.</p>
      ) : (
        <div className="divide-y divide-zinc-100">{children}</div>
      )}
    </div>
  );

  const QueueRow = ({ row, actions }: { row: QuestionRow; actions: React.ReactNode }) => {
    const isExpanded = expandedId === row.id;
    const canSelect = isDeletableQuestion(row.status);
    return (
      <div>
        <div className="flex items-start gap-3 px-4 py-3">
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
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              {badge(STATUS_BADGE[row.status] ?? "", row.status)}
              {badge(QUALITY_BADGE[row.quality_status] ?? "", row.quality_status.replace("_", " "))}
              <span className="text-xs text-zinc-400">{row.trainer_type}</span>
              {row.is_flagged && <span className="text-xs text-red-500 font-medium">⚑ {row.flag_count}</span>}
            </div>
            <p className="text-sm text-zinc-800 truncate">
              {row.stem || (row.content as Record<string,unknown>).question as string || "n/a"}
            </p>
            {row.legacy_id && <p className="text-xs text-zinc-400 font-mono">{row.legacy_id}</p>}
          </button>
          <div className="shrink-0 flex items-center gap-1.5 mt-0.5">{actions}</div>
        </div>
        {isExpanded && (
          <ExpandedQuestion
            row={row}
            onActivate={handleActivate}
            onArchive={() => {}}
            onDuplicate={handleDuplicate}
            onSendToReview={handleSendToReview}
            onDelete={handleDelete}
            onSaveEdit={handleSaveEdit}
            actionLoading={actionLoading}
          />
        )}
      </div>
    );
  };

  const ActionBtn = ({ onClick, disabled, children }: {
    onClick: () => void; disabled: boolean; children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-xs rounded hover:bg-zinc-800 disabled:opacity-50"
    >
      {children}
    </button>
  );

  const DeleteBtn = ({ row, onClick, disabled }: {
    row: QuestionRow;
    onClick: () => void;
    disabled: boolean;
  }) => {
    if (!isDeletableQuestion(row.status)) return null;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-800 text-xs rounded hover:bg-red-100 border border-red-200 disabled:opacity-50"
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {(error || actionError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {error || actionError}
        </div>
      )}

      <BulkDeleteBar
        selectedCount={selection.selectedCount}
        busy={bulkDeleting}
        onClear={selection.clearSelection}
        onDelete={handleBulkDelete}
      />

      <Section
        title="Unchecked drafts"
        count={drafts.length}
        color="bg-zinc-200 text-zinc-700"
        sectionRows={drafts}
      >
        {drafts.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            actions={
              <>
                {isActionLoading(actionLoading, "activate", row.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <ActionBtn onClick={() => handleActivate(row.id)} disabled={!!actionLoading}>
                    <Zap className="w-3 h-3" /> Activate
                  </ActionBtn>
                )}
                {isActionLoading(actionLoading, "delete", row.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-300" />
                ) : (
                  <DeleteBtn
                    row={row}
                    onClick={() => handleDelete(row.id)}
                    disabled={!!actionLoading}
                  />
                )}
              </>
            }
          />
        ))}
      </Section>

      <Section
        title="Needs review"
        count={needsReview.length}
        color="bg-amber-100 text-amber-700"
        sectionRows={needsReview}
      >
        {needsReview.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            actions={
              <>
                {isActionLoading(actionLoading, "duplicate", row.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <ActionBtn onClick={() => handleDuplicate(row.id)} disabled={!!actionLoading}>
                    <Copy className="w-3 h-3" /> Duplicate
                  </ActionBtn>
                )}
                {isActionLoading(actionLoading, "delete", row.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-300" />
                ) : (
                  <DeleteBtn
                    row={row}
                    onClick={() => handleDelete(row.id)}
                    disabled={!!actionLoading}
                  />
                )}
              </>
            }
          />
        ))}
      </Section>

      <Section
        title="Flagged by students"
        count={flagged.length}
        color="bg-red-100 text-red-700"
        sectionRows={flagged}
      >
        {flagged.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            actions={
              isActionLoading(actionLoading, "duplicate", row.id) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
              ) : (
                <ActionBtn onClick={() => handleDuplicate(row.id)} disabled={!!actionLoading}>
                  <Copy className="w-3 h-3" /> Duplicate
                </ActionBtn>
              )
            }
          />
        ))}
      </Section>
    </div>
  );
}
