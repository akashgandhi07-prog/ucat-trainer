import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  Filter,
  Flag,
  Loader2,
  RefreshCw,
  Search,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionRow = {
  id: string;
  legacy_id: string | null;
  section: string;
  trainer_type: string;
  question_kind: string;
  status: "draft" | "active" | "archived";
  difficulty: "easy" | "medium" | "hard";
  skill_tag: string;
  stem: string;
  explanation: string;
  content: Record<string, unknown>;
  quality_status: string;
  quality_notes: string | null;
  is_flagged: boolean;
  flag_count: number;
  replaces_question_id: string | null;
  created_at: string;
  updated_at: string;
};

type GetQuestionsResult = { total: number; rows: QuestionRow[] };

type CoverageRow = { trainer_type: string; total: number; active: number; draft: number; archived: number };
type DiffRow    = { difficulty: string; total: number; active: number };
type QualRow    = { quality_status: string; total: number };
type StatRow    = { status: string; total: number };

type Coverage = {
  by_trainer_type:   CoverageRow[];
  by_difficulty:     DiffRow[];
  by_quality_status: QualRow[];
  by_status:         StatRow[];
  flagged_count:     number;
};

type Tab = "questions" | "queue" | "reports" | "coverage" | "csv";

type ReportRow = {
  id: string;
  reason: string;
  notes: string | null;
  status: "open" | "reviewed" | "dismissed" | "fixed";
  created_at: string;
  reviewed_at: string | null;
  question_id: string;
  question_legacy_id: string | null;
  question_trainer_type: string;
  question_status: string;
  question_stem: string;
  question_flag_count: number;
};

type GetReportsResult = { total: number; rows: ReportRow[] };

// ─── Constants ───────────────────────────────────────────────────────────────

const TRAINER_TYPES = [
  "venn-logic",
  "data-logic",
  "argument-judge",
  "sjt-appropriateness",
  "sjt-importance",
  "sjt-ranking",
  "inference",
  "vr-passages",
  "qr-conversions",
];

const SECTIONS = ["dm", "sjt", "vr", "qr"];
const STATUSES = ["draft", "active", "archived"];
const QUALITIES = ["unchecked", "pass", "needs_review", "fail"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const STATUS_BADGE: Record<string, string> = {
  active:   "bg-black text-white",
  draft:    "bg-zinc-200 text-zinc-700",
  archived: "bg-zinc-100 text-zinc-400",
};

const QUALITY_BADGE: Record<string, string> = {
  pass:         "bg-black text-white",
  unchecked:    "bg-zinc-200 text-zinc-600",
  needs_review: "bg-amber-100 text-amber-700 border border-amber-300",
  fail:         "bg-red-100 text-red-700 border border-red-300",
};

const CSV_COLUMNS = [
  "id", "legacy_id", "section", "trainer_type", "question_kind",
  "status", "difficulty", "skill_tag", "stem", "explanation",
  "quality_status", "quality_notes", "is_flagged", "flag_count",
  "created_at",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function badge(cls: string, text: string) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(rows: QuestionRow[], filename: string) {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((r) =>
    CSV_COLUMNS.map((col) => csvEscape(r[col as keyof QuestionRow])).join(",")
  );
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── QuestionRow expanded view ────────────────────────────────────────────────

function ExpandedQuestion({
  row,
  onActivate,
  onArchive,
  onDuplicate,
  actionLoading,
}: {
  row: QuestionRow;
  onActivate: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
  actionLoading: string | null;
}) {
  const content = row.content as Record<string, unknown>;
  const options = content.options as Record<string, string> | undefined;
  const isLoading = actionLoading === row.id;

  return (
    <div className="px-4 pb-4 pt-2 border-t border-zinc-200 space-y-3 text-sm">
      {row.stem && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Stem</p>
          <p className="text-zinc-800 whitespace-pre-wrap">{row.stem}</p>
        </div>
      )}
      {!!content.question && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Question</p>
          <p className="text-zinc-800 whitespace-pre-wrap">{String(content.question)}</p>
        </div>
      )}
      {options && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Options</p>
          <ul className="space-y-0.5">
            {(["A", "B", "C", "D"] as const).map((k) =>
              options[k] ? (
                <li key={k} className={`flex gap-2 ${content.correctAnswer === k ? "font-semibold" : ""}`}>
                  <span className="text-zinc-400 w-4 shrink-0">{k}</span>
                  <span className={content.correctAnswer === k ? "text-black" : "text-zinc-700"}>
                    {options[k]}
                    {content.correctAnswer === k && (
                      <span className="ml-1 text-xs text-zinc-400">(correct)</span>
                    )}
                  </span>
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}
      {!!content.commonTrap && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Common Trap</p>
          <p className="text-zinc-700 whitespace-pre-wrap">{String(content.commonTrap)}</p>
        </div>
      )}
      {row.explanation && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Explanation</p>
          <p className="text-zinc-700 whitespace-pre-wrap">{row.explanation}</p>
        </div>
      )}
      {row.quality_notes && (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Quality Notes</p>
          <p className="text-zinc-600 italic">{row.quality_notes}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1 flex-wrap">
        {row.status === "draft" && (
          <button
            onClick={() => onActivate(row.id)}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-zinc-800 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Activate
          </button>
        )}
        {row.status === "active" && (
          <>
            <button
              onClick={() => onDuplicate(row.id)}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
              Duplicate as Draft
            </button>
            <button
              onClick={() => onArchive(row.id)}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
              Archive
            </button>
          </>
        )}
        {row.status === "archived" && (
          <button
            onClick={() => onActivate(row.id)}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            Re-activate
          </button>
        )}
        {row.status !== "active" && (
          <button
            onClick={() => onDuplicate(row.id)}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs rounded hover:bg-zinc-200 border border-zinc-300 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
            Duplicate as Draft
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Questions Tab ────────────────────────────────────────────────────────────

function QuestionsTab() {
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

  const load = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("admin_get_trainer_questions", {
        p_section:        section        || null,
        p_trainer_type:   trainerType    || null,
        p_status:         status         || null,
        p_quality_status: quality        || null,
        p_difficulty:     difficulty     || null,
        p_is_flagged:     flagged === "yes" ? true : flagged === "no" ? false : null,
        p_search:         search.trim()  || null,
        p_limit:          PAGE_SIZE,
        p_offset:         pageNum * PAGE_SIZE,
      });
      if (rpcError) throw rpcError;
      const result = data as GetQuestionsResult;
      setRows(result.rows ?? []);
      setTotal(result.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions.");
    } finally {
      setLoading(false);
    }
  }, [section, trainerType, status, quality, difficulty, flagged, search]);

  useEffect(() => { load(0); }, [load]);

  const handleActivate = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    const { error: err } = await supabase.rpc("admin_update_question_status", { p_id: id, p_status: "active" });
    setActionLoading(null);
    if (err) { setActionError(err.message); return; }
    load(page);
  };

  const handleArchive = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    const { error: err } = await supabase.rpc("admin_update_question_status", { p_id: id, p_status: "archived" });
    setActionLoading(null);
    if (err) { setActionError(err.message); return; }
    load(page);
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(id);
    setActionError(null);
    const { data, error: err } = await supabase.rpc("admin_duplicate_question_as_draft", { p_id: id });
    setActionLoading(null);
    if (err) { setActionError(err.message); return; }
    const result = data as { new_id: string } | null;
    if (result?.new_id) {
      load(page);
      setExpandedId(result.new_id);
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
        <p className="text-sm text-zinc-500">
          {total} question{total !== 1 ? "s" : ""} matching filters
          {total > PAGE_SIZE && ` · page ${page + 1} of ${totalPages}`}
        </p>
      )}

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
              return (
                <div key={row.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
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
                          {row.stem || (row.content as Record<string,unknown>).question as string || "—"}
                        </p>
                        {row.legacy_id && (
                          <p className="text-xs text-zinc-400 font-mono">{row.legacy_id}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-zinc-400 mt-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <ExpandedQuestion
                      row={row}
                      onActivate={handleActivate}
                      onArchive={handleArchive}
                      onDuplicate={handleDuplicate}
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

// ─── Coverage Tab ─────────────────────────────────────────────────────────────

function CoverageTab() {
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc("admin_get_question_coverage");
        if (rpcError) throw rpcError;
        setCoverage(data as Coverage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load coverage.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    );
  }

  if (!coverage) return null;

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {coverage.by_status.map((s) => (
          <div key={s.status} className="bg-white border border-zinc-200 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900">{s.total}</p>
            <p className="text-xs text-zinc-500 mt-1 capitalize">{s.status}</p>
          </div>
        ))}
        <div className="bg-white border border-zinc-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{coverage.flagged_count}</p>
          <p className="text-xs text-zinc-500 mt-1">Flagged</p>
        </div>
      </div>

      {/* By trainer type */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-800">By trainer type</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs text-zinc-500">
              <th className="text-left px-4 py-2">Trainer</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-right px-4 py-2">Active</th>
              <th className="text-right px-4 py-2">Draft</th>
              <th className="text-right px-4 py-2">Archived</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {coverage.by_trainer_type.map((row) => (
              <tr key={row.trainer_type} className="hover:bg-zinc-50">
                <td className="px-4 py-2 font-mono text-xs text-zinc-700">{row.trainer_type}</td>
                <td className="px-4 py-2 text-right text-zinc-700">{row.total}</td>
                <td className="px-4 py-2 text-right font-medium text-zinc-900">{row.active}</td>
                <td className="px-4 py-2 text-right text-zinc-400">{row.draft}</td>
                <td className="px-4 py-2 text-right text-zinc-300">{row.archived}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By difficulty and quality side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">By difficulty</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                <th className="text-left px-4 py-2">Difficulty</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {coverage.by_difficulty.map((row) => (
                <tr key={row.difficulty} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 capitalize text-zinc-700">{row.difficulty}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{row.total}</td>
                  <td className="px-4 py-2 text-right font-medium text-zinc-900">{row.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">By quality status</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                <th className="text-left px-4 py-2">Quality</th>
                <th className="text-right px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {coverage.by_quality_status.map((row) => (
                <tr key={row.quality_status} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 text-zinc-700">{row.quality_status.replace("_", " ")}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Review Tab ───────────────────────────────────────────────────────────

function CsvReviewTab() {
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
      const { data, error: rpcError } = await supabase.rpc("admin_get_trainer_questions", {
        p_status:       status       || null,
        p_trainer_type: trainerType  || null,
        p_limit:        500,
        p_offset:       0,
      });
      if (rpcError) throw rpcError;
      const result = data as GetQuestionsResult;
      setRows(result.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load questions.");
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
                    {row.stem || (row.content as Record<string,unknown>).question as string || "—"}
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

// ─── Review Queue Tab ─────────────────────────────────────────────────────────

function ReviewQueueTab() {
  const [drafts, setDrafts]     = useState<QuestionRow[]>([]);
  const [needsReview, setNeedsReview] = useState<QuestionRow[]>([]);
  const [flagged, setFlagged]   = useState<QuestionRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, nr, fl] = await Promise.all([
        supabase.rpc("admin_get_trainer_questions", { p_status: "draft",  p_limit: 200, p_offset: 0 }),
        supabase.rpc("admin_get_trainer_questions", { p_quality_status: "needs_review", p_limit: 200, p_offset: 0 }),
        supabase.rpc("admin_get_trainer_questions", { p_is_flagged: true, p_status: "active", p_limit: 200, p_offset: 0 }),
      ]);
      if (d.error)  throw d.error;
      if (nr.error) throw nr.error;
      if (fl.error) throw fl.error;
      setDrafts((d.data as GetQuestionsResult).rows ?? []);
      setNeedsReview((nr.data as GetQuestionsResult).rows ?? []);
      setFlagged((fl.data as GetQuestionsResult).rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActivate = async (id: string) => {
    setActionLoading(id); setActionError(null);
    const { error: err } = await supabase.rpc("admin_update_question_status", { p_id: id, p_status: "active" });
    setActionLoading(null);
    if (err) { setActionError(err.message); return; }
    load();
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(id); setActionError(null);
    const { error: err } = await supabase.rpc("admin_duplicate_question_as_draft", { p_id: id });
    setActionLoading(null);
    if (err) { setActionError(err.message); return; }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }

  const Section = ({ title, count, color, children }: {
    title: string; count: number; color: string; children: React.ReactNode;
  }) => (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-6">None — all clear.</p>
      ) : (
        <div className="divide-y divide-zinc-100">{children}</div>
      )}
    </div>
  );

  const QueueRow = ({ row, actions }: { row: QuestionRow; actions: React.ReactNode }) => {
    const isExpanded = expandedId === row.id;
    return (
      <div>
        <div className="flex items-start gap-3 px-4 py-3">
          <button
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
              {row.stem || (row.content as Record<string,unknown>).question as string || "—"}
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

  return (
    <div className="space-y-6">
      {(error || actionError) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {error || actionError}
        </div>
      )}

      <Section title="Unchecked drafts" count={drafts.length} color="bg-zinc-200 text-zinc-700">
        {drafts.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            actions={
              actionLoading === row.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                : <ActionBtn onClick={() => handleActivate(row.id)} disabled={!!actionLoading}>
                    <Zap className="w-3 h-3" /> Activate
                  </ActionBtn>
            }
          />
        ))}
      </Section>

      <Section title="Needs review" count={needsReview.length} color="bg-amber-100 text-amber-700">
        {needsReview.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            actions={
              actionLoading === row.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                : <ActionBtn onClick={() => handleDuplicate(row.id)} disabled={!!actionLoading}>
                    <Copy className="w-3 h-3" /> Duplicate
                  </ActionBtn>
            }
          />
        ))}
      </Section>

      <Section title="Flagged by students" count={flagged.length} color="bg-red-100 text-red-700">
        {flagged.map((row) => (
          <QueueRow
            key={row.id}
            row={row}
            actions={
              actionLoading === row.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                : <ActionBtn onClick={() => handleDuplicate(row.id)} disabled={!!actionLoading}>
                    <Copy className="w-3 h-3" /> Duplicate
                  </ActionBtn>
            }
          />
        ))}
      </Section>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
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
      const { data, error: rpcError } = await supabase.rpc("admin_get_question_reports", {
        p_status: statusFilter || null,
        p_limit:  PAGE_SIZE,
        p_offset: pageNum * PAGE_SIZE,
      });
      if (rpcError) throw rpcError;
      const result = data as GetReportsResult;
      setRows(result.rows ?? []);
      setTotal(result.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
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
            {statusFilter === "open" ? "No open reports — all clear." : "No reports found."}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestionLabDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("questions");

  const skipLinkClass =
    "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 " +
    "focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded focus:shadow-lg";

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>Skip to main content</a>
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center" tabIndex={-1}>
          <p className="text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>Skip to main content</a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4 text-center"
          tabIndex={-1}
        >
          <AlertCircle className="w-10 h-10 text-zinc-400" />
          <p className="text-zinc-600">
            {!user ? "Sign in as an admin to access the Question Lab." : "You don't have admin access."}
          </p>
          <Link to="/admin" className="text-sm text-zinc-500 underline">Back to Admin</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "questions", label: "Trainer Questions" },
    { id: "queue",     label: "Review Queue" },
    { id: "reports",   label: "Reports" },
    { id: "coverage",  label: "Coverage" },
    { id: "csv",       label: "CSV Review" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <a href="#main-content" className={skipLinkClass}>Skip to main content</a>
      <Header />
      <main
        id="main-content"
        className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Question Lab</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage and review skills-trainer questions.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              to="/admin"
              className="px-3 py-1.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50"
            >
              ← Analytics
            </Link>
            <Link
              to="/admin/question-lab/gold-standards"
              className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50"
            >
              Gold Standards
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "questions" && <QuestionsTab />}
        {tab === "queue"     && <ReviewQueueTab />}
        {tab === "reports"   && <ReportsTab />}
        {tab === "coverage"  && <CoverageTab />}
        {tab === "csv"       && <CsvReviewTab />}
      </main>
      <Footer />
    </div>
  );
}
