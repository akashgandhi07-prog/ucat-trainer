import { useCallback, useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Loader2,
  Trash2,
  Undo2,
  Zap,
} from "lucide-react";
import QuestionLabQuestionEditor from "../../../components/admin/QuestionLabQuestionEditor";
import QuestionLabContentPreview from "../../../components/admin/QuestionLabContentPreview";
import { isDeletableQuestion } from "../../../lib/questionLabDelete";
import { type QuestionEditPatch } from "../../../lib/questionLabEdit";
import { formatExplanationForDisplay } from "../../../lib/studentFacingCopy";
import { type QuestionRow, isActionLoading } from "./shared";

// eslint-disable-next-line react-refresh/only-export-components -- small JSX helper co-located with the components that use it
export function badge(cls: string, text: string) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- selection hook co-located with the components that use it
export function useQuestionSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelectedMany = useCallback((ids: string[], on: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    clearSelection,
    toggleSelected,
    setSelectedMany,
    isSelected,
  };
}

export function BulkDeleteBar({
  selectedCount,
  busy,
  onClear,
  onDelete,
}: {
  selectedCount: number;
  busy: boolean;
  onClear: () => void;
  onDelete: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-900">
        {selectedCount} question{selectedCount !== 1 ? "s" : ""} selected
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          className="px-3 py-1.5 text-xs border border-red-200 rounded text-red-800 hover:bg-red-100 disabled:opacity-50"
        >
          Clear selection
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-700 text-white text-xs rounded hover:bg-red-800 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Delete selected
        </button>
      </div>
    </div>
  );
}

export function DeletableCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => {
        e.stopPropagation();
        onChange();
      }}
      onClick={(e) => e.stopPropagation()}
      className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-red-700 focus:ring-red-500"
      aria-label="Select question for bulk delete"
    />
  );
}

export function SectionSelectAll({
  rows,
  selectedIds,
  onToggleAll,
  disabled,
}: {
  rows: QuestionRow[];
  selectedIds: Set<string>;
  onToggleAll: (ids: string[], selected: boolean) => void;
  disabled?: boolean;
}) {
  const deletableIds = useMemo(
    () => rows.filter((r) => isDeletableQuestion(r.status)).map((r) => r.id),
    [rows],
  );

  if (deletableIds.length === 0) return null;

  const allSelected = deletableIds.every((id) => selectedIds.has(id));

  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer">
      <input
        type="checkbox"
        checked={allSelected}
        disabled={disabled}
        onChange={() => onToggleAll(deletableIds, !allSelected)}
        className="h-3.5 w-3.5 rounded border-zinc-300 text-red-700 focus:ring-red-500"
      />
      Select all ({deletableIds.length})
    </label>
  );
}

export function ExpandedQuestion({
  row,
  onActivate,
  onArchive,
  onDuplicate,
  onSendToReview,
  onDelete,
  onSaveEdit,
  actionLoading,
}: {
  row: QuestionRow;
  onActivate: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSendToReview: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, patch: QuestionEditPatch) => Promise<void>;
  actionLoading: string | null;
}) {
  const content = row.content as Record<string, unknown>;
  const activateLoading = isActionLoading(actionLoading, "activate", row.id);
  const duplicateLoading = isActionLoading(actionLoading, "duplicate", row.id);
  const archiveLoading = isActionLoading(actionLoading, "archive", row.id);
  const reviewLoading = isActionLoading(actionLoading, "review", row.id);
  const deleteLoading = isActionLoading(actionLoading, "delete", row.id);
  const saveLoading = isActionLoading(actionLoading, "save", row.id);
  const canDelete = row.status === "draft" || row.status === "archived";
  const anyLoading =
    activateLoading ||
    duplicateLoading ||
    archiveLoading ||
    reviewLoading ||
    deleteLoading ||
    saveLoading;

  return (
    <div className="px-4 pb-4 pt-2 border-t border-zinc-200 space-y-3 text-sm">
      {row.stem && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Stem</p>
          <p className="text-zinc-800 whitespace-pre-wrap">{row.stem}</p>
        </div>
      )}
      <QuestionLabContentPreview
        questionKind={row.question_kind}
        content={content}
        stem={row.stem}
      />
      {row.explanation && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Explanation</p>
          <p className="text-zinc-700 whitespace-pre-wrap">
            {formatExplanationForDisplay(row.explanation)}
          </p>
        </div>
      )}
      {row.quality_notes && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Quality Notes</p>
          <p className="text-zinc-600 italic">{row.quality_notes}</p>
        </div>
      )}

      {row.status !== "archived" && (
        <QuestionLabQuestionEditor
          key={`${row.id}-${row.updated_at}`}
          row={row}
          saving={saveLoading}
          onSave={(patch) => onSaveEdit(row.id, patch)}
        />
      )}

      <div className="flex gap-2 pt-1 flex-wrap">
        {row.status === "draft" && (
          <button
            onClick={() => onActivate(row.id)}
            disabled={anyLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-zinc-800 disabled:opacity-50"
          >
            {activateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Activate
          </button>
        )}
        {row.status === "active" && (
          <>
            <button
              onClick={() => onSendToReview(row.id)}
              disabled={anyLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-900 text-xs rounded hover:bg-amber-100 border border-amber-200 disabled:opacity-50"
            >
              {reviewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
              Send to review queue
            </button>
            <button
              onClick={() => onDuplicate(row.id)}
              disabled={anyLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
            >
              {duplicateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              Duplicate as Draft
            </button>
            <button
              onClick={() => onArchive(row.id)}
              disabled={anyLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
            >
              {archiveLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
              Archive
            </button>
          </>
        )}
        {row.status === "archived" && (
          <button
            onClick={() => onActivate(row.id)}
            disabled={anyLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
          >
            {activateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Re-activate
          </button>
        )}
        {row.status !== "active" && (
          <button
            onClick={() => onDuplicate(row.id)}
            disabled={anyLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
          >
            {duplicateLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
            Duplicate as Draft
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(row.id)}
            disabled={anyLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-800 text-xs rounded hover:bg-red-100 border border-red-200 disabled:opacity-50"
          >
            {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
