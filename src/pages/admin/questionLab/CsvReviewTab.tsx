import { useState } from "react";
import { AlertCircle, Download, Eye, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  type GetQuestionsResult,
  type QuestionRow,
  STATUS_BADGE,
  STATUSES,
  TRAINER_TYPES,
  downloadCsv,
  errorMessage,
  trainerQuestionsArgs,
  withAuthSessionRetry,
} from "./shared";
import { badge } from "./components";

export default function CsvReviewTab() {
  const [rows, setRows]           = useState<QuestionRow[]>([]);
  const [status, setStatus]       = useState("active");
  const [trainerType, setType]    = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const { data, error: rpcError } = await withAuthSessionRetry<GetQuestionsResult>(() =>
        supabase.rpc(
          "admin_get_trainer_questions",
          trainerQuestionsArgs({
            status,
            trainerType,
            limit: 500,
            offset: 0,
          }),
        ),
      );
      if (rpcError) throw rpcError;
      const result = data as GetQuestionsResult;
      setRows(result.rows ?? []);
    } catch (err) {
      setError(errorMessage(err, "Failed to load questions."));
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportSelected = () => {
    const toExport = rows.filter((r) => selected.has(r.id));
    downloadCsv(toExport, `ql-review-${trainerType || "all"}-${Date.now()}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
        <p className="text-sm text-zinc-600">
          Export questions to CSV for bulk review in ChatGPT or Claude. Import results are handled manually via the Questions tab.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="">All statuses</option>
          </select>
          <select
            value={trainerType}
            onChange={(e) => setType(e.target.value)}
            className="border border-zinc-200 rounded px-2 py-1.5 text-sm bg-white text-zinc-800"
          >
            <option value="">All trainer types</option>
            {TRAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
            Load
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === rows.length}
                onChange={toggleAll}
                className="rounded"
              />
              Select all ({rows.length})
            </label>
            <button
              onClick={exportSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded text-sm disabled:opacity-40"
            >
              <Download className="w-3 h-3" />
              Export {selected.size > 0 ? `${selected.size} selected` : ""}
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
            {rows.map((row) => (
              <label
                key={row.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {badge(STATUS_BADGE[row.status] ?? "", row.status)}
                    <span className="text-xs text-zinc-400">{row.trainer_type}</span>
                    <span className="text-xs text-zinc-400">{row.difficulty}</span>
                    {row.skill_tag && <span className="text-xs text-zinc-500">{row.skill_tag}</span>}
                  </div>
                  <p className="text-sm text-zinc-800 truncate">
                    {row.stem || (row.content as Record<string,unknown>).question as string || "n/a"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
