import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Flag, Loader2, RefreshCw, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import {
  type GetReportsResult,
  type ReportRow,
  STATUS_BADGE,
  errorMessage,
  withAuthSessionRetry,
} from "./shared";
import { badge } from "./components";

const REPORT_REASON_LABEL: Record<string, string> = {
  wrong_answer:     "Wrong answer",
  bad_explanation:  "Bad explanation",
  ambiguous:        "Ambiguous",
  typo:             "Typo",
  technical_issue:  "Technical issue",
  other:            "Other",
};

const REPORT_STATUS_BADGE: Record<string, string> = {
  open:      "bg-red-100 text-red-700 border border-red-300",
  reviewed:  "bg-amber-100 text-amber-700 border border-amber-300",
  dismissed: "bg-zinc-100 text-zinc-400",
  fixed:     "bg-black text-white",
};

export default function ReportsTab() {
  const [rows, setRows]         = useState<ReportRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [statusFilter, setStatusFilter] = useState("open");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async (pageNum = 0) => {
    setLoading(true); setError(null);
    try {
      const { data, error: rpcError } = await withAuthSessionRetry<GetReportsResult>(() => supabase.rpc("admin_get_question_reports", {
        p_status: statusFilter || null,
        p_limit:  PAGE_SIZE,
        p_offset: pageNum * PAGE_SIZE,
      }));
      if (rpcError) throw rpcError;
      const result = data as GetReportsResult;
      setRows(result.rows ?? []);
      setTotal(result.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      setError(errorMessage(err, "Failed to load reports."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(0); }, [load]);

  const handleStatus = async (id: string, status: "reviewed" | "dismissed" | "fixed") => {
    setActionLoading(id); setActionError(null);
    const { error: err } = await supabase.rpc("admin_update_report_status", { p_id: id, p_status: status });
    setActionLoading(null);
    if (err) { setActionError(err.message); return; }
    load(page);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-wrap items-center gap-2">
        <Flag className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-600 mr-1">Status</span>
        {(["open", "reviewed", "dismissed", "fixed", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {s === "" ? "All" : s}
          </button>
        ))}
        <button
          onClick={() => load(0)}
          disabled={loading}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </div>

      {(error || actionError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {error || actionError}
        </div>
      )}

      {!loading && !error && (
        <p className="text-sm text-zinc-500">{total} report{total !== 1 ? "s" : ""}</p>
      )}

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">
            {statusFilter === "open" ? "No open reports. All clear." : "No reports found."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const isLoading = actionLoading === r.id;
              return (
                <div key={r.id} className="px-4 py-3 space-y-2">
                  {/* Report header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {badge(REPORT_STATUS_BADGE[r.status] ?? "", r.status)}
                        <span className="text-xs font-medium text-zinc-700">
                          {REPORT_REASON_LABEL[r.reason] ?? r.reason}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {r.notes && (
                        <p className="text-xs text-zinc-600 italic">"{r.notes}"</p>
                      )}
                    </div>
                    {r.status === "open" && (
                      <div className="shrink-0 flex gap-1.5">
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                        ) : (
                          <>
                            <button
                              onClick={() => handleStatus(r.id, "fixed")}
                              className="flex items-center gap-1 px-2 py-1 bg-black text-white text-xs rounded hover:bg-zinc-800"
                            >
                              <CheckCircle className="w-3 h-3" /> Fixed
                            </button>
                            <button
                              onClick={() => handleStatus(r.id, "dismissed")}
                              className="flex items-center gap-1 px-2 py-1 border border-zinc-200 text-zinc-600 text-xs rounded hover:bg-zinc-50"
                            >
                              <X className="w-3 h-3" /> Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Linked question */}
                  <div className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-zinc-700">{r.question_trainer_type}</span>
                      {r.question_legacy_id && (
                        <span className="font-mono text-zinc-400">{r.question_legacy_id}</span>
                      )}
                      {badge(STATUS_BADGE[r.question_status] ?? "", r.question_status)}
                      {r.question_flag_count > 1 && (
                        <span className="text-red-500 font-medium">⚑ {r.question_flag_count} flags</span>
                      )}
                    </div>
                    <p className="text-zinc-600 truncate">{r.question_stem}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => load(page - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 border border-zinc-200 rounded text-sm disabled:opacity-40 hover:bg-zinc-50"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">{page + 1} / {totalPages}</span>
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
