import type { Dispatch, SetStateAction } from "react";
import { type ResolvedQuestion } from "../../lib/resolveFlaggedQuestion";
import {
  overrideKeyForIdentifier,
  type QuestionOverrideMap,
} from "../../lib/questionOverrides";
import type { QuestionFeedbackIssueType } from "../../lib/questionFeedback";

type QuestionFeedbackRow = {
  id: string;
  user_id: string | null;
  trainer_type: string;
  question_kind: string;
  question_identifier: string;
  issue_type: QuestionFeedbackIssueType;
  comment: string | null;
  passage_id: string | null;
  session_id: string | null;
  page_url: string | null;
  created_at: string;
};

function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportQuestionFeedbackCsv(rows: QuestionFeedbackRow[]): void {
  const headers = [
    "id",
    "trainer_type",
    "question_kind",
    "question_identifier",
    "issue_type",
    "comment",
    "passage_id",
    "page_url",
    "created_at",
  ];
  const escape = (v: string | null) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rowsOut = rows.map((r) =>
    [
      r.id,
      r.trainer_type,
      r.question_kind,
      r.question_identifier,
      r.issue_type,
      escape(r.comment),
      escape(r.passage_id),
      escape(r.page_url),
      r.created_at,
    ].join(",")
  );
  downloadText(
    "question-feedback-export.csv",
    [headers.join(","), ...rowsOut].join("\n"),
    "text/csv;charset=utf-8"
  );
}

function exportQuestionFeedbackJson(rows: QuestionFeedbackRow[]): void {
  downloadText(
    "question-feedback-export.json",
    JSON.stringify(rows, null, 2),
    "application/json"
  );
}

function prettyFieldLabel(k: string): string {
  if (k.startsWith("opt_")) return `Option ${k.slice(4)}`;
  if (k === "questionText") return "Question text";
  if (k === "correctAnswer") return "Correct answer (A/B/C/D)";
  if (k === "stimulus_text") return "Stimulus";
  if (k === "conclusion_text") return "Conclusion";
  if (k === "pivotInsight") return "Explanation";
  return k.charAt(0).toUpperCase() + k.slice(1);
}

type AdminQuestionFeedbackSectionProps = {
  questionFeedback: QuestionFeedbackRow[];
  qfTrainerFilter: string;
  setQfTrainerFilter: (t: string) => void;
  expandedQF: Set<string>;
  setExpandedQF: Dispatch<SetStateAction<Set<string>>>;
  qfDismissing: Set<string>;
  qfDeleting: Set<string>;
  qfOverrides: QuestionOverrideMap;
  qfHiding: Set<string>;
  qfResolved: Map<string, ResolvedQuestion | "loading">;
  qfEditing: string | null;
  setQfEditing: (id: string | null) => void;
  qfEditForm: Record<string, string>;
  setQfEditForm: Dispatch<SetStateAction<Record<string, string>>>;
  qfSaving: Set<string>;
  ensureResolved: (questionIdentifier: string) => void;
  handleToggleHide: (
    questionIdentifier: string,
    questionKind: string,
    trainerType: string,
    hide: boolean,
  ) => void;
  handleDismissQuestionFeedback: (questionIdentifier: string) => void;
  handleDeleteQuestion: (
    questionKind: string,
    questionIdentifier: string,
    trainerType: string,
  ) => void;
  startEditQuestion: (questionIdentifier: string, resolved: ResolvedQuestion) => void;
  saveEditQuestion: (
    questionIdentifier: string,
    resolved: ResolvedQuestion,
    questionKind: string,
    trainerType: string,
  ) => void;
};

export default function AdminQuestionFeedbackSection({
  questionFeedback,
  qfTrainerFilter,
  setQfTrainerFilter,
  expandedQF,
  setExpandedQF,
  qfDismissing,
  qfDeleting,
  qfOverrides,
  qfHiding,
  qfResolved,
  qfEditing,
  setQfEditing,
  qfEditForm,
  setQfEditForm,
  qfSaving,
  ensureResolved,
  handleToggleHide,
  handleDismissQuestionFeedback,
  handleDeleteQuestion,
  startEditQuestion,
  saveEditQuestion,
}: AdminQuestionFeedbackSectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Question feedback — all trainers
            {questionFeedback.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {questionFeedback.length} report{questionFeedback.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-question error reports from every trainer. Use this to find and fix confusing or flawed items.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportQuestionFeedbackCsv(
              questionFeedback.filter((r) => qfTrainerFilter === "all" || r.trainer_type === qfTrainerFilter)
            )}
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportQuestionFeedbackJson(
              questionFeedback.filter((r) => qfTrainerFilter === "all" || r.trainer_type === qfTrainerFilter)
            )}
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Trainer-type filter pills */}
      {questionFeedback.length > 0 && (() => {
        const trainerTypes = Array.from(new Set(questionFeedback.map((r) => r.trainer_type))).sort();
        return (
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", ...trainerTypes] as string[]).map((t) => {
              const count = t === "all" ? questionFeedback.length : questionFeedback.filter((r) => r.trainer_type === t).length;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setQfTrainerFilter(t)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    qfTrainerFilter === t
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {t === "all" ? "All trainers" : t.replace(/_/g, " ")}
                  <span className={`ml-1.5 ${qfTrainerFilter === t ? "text-slate-300" : "text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })()}

      <div className="mb-4 bg-card rounded-xl border border-border overflow-x-auto">
        {questionFeedback.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No question reports yet. Reports appear here when users flag an issue in any trainer.
          </div>
        ) : (
        <>{(() => {
            const aggregatesMap = new Map<
              string,
              {
                trainer_type: string;
                question_kind: string;
                question_identifier: string;
                passage_id: string | null;
                total: number;
                last_created_at: string;
                issues: Record<QuestionFeedbackIssueType, number>;
              }
            >();
            const filteredFeedback = questionFeedback.filter(
              (r) => qfTrainerFilter === "all" || r.trainer_type === qfTrainerFilter
            );
            filteredFeedback.forEach((row) => {
              const key = `${row.trainer_type}::${row.question_identifier}`;
              let entry = aggregatesMap.get(key);
              if (!entry) {
                entry = {
                  trainer_type: row.trainer_type,
                  question_kind: row.question_kind,
                  question_identifier: row.question_identifier,
                  passage_id: row.passage_id,
                  total: 0,
                  last_created_at: row.created_at,
                  issues: {
                    wrong_answer: 0,
                    unclear_wording: 0,
                    too_hard: 0,
                    too_easy: 0,
                    typo: 0,
                    other: 0,
                  },
                };
                aggregatesMap.set(key, entry);
              }
              entry.total += 1;
              entry.issues[row.issue_type] += 1;
              if (row.created_at > entry.last_created_at) {
                entry.last_created_at = row.created_at;
              }
            });
            const aggregates = Array.from(aggregatesMap.values()).sort((a, b) => {
              if (b.total !== a.total) return b.total - a.total;
              return b.last_created_at.localeCompare(a.last_created_at);
            });
            const individualReports = (identifier: string) =>
              filteredFeedback.filter(
                (r) => r.question_identifier === identifier
              );
            return (
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-secondary">
                    <th className="px-3 py-2 text-left font-medium text-foreground">
                      Trainer
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">
                      Question ID
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-foreground">
                      Reports
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-foreground">
                      Wrong
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-foreground">
                      Unclear
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-foreground">
                      Last reported
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.map((row) => {
                    const key = `${row.trainer_type}::${row.question_identifier}`;
                    const isExpanded = expandedQF.has(row.question_identifier);
                    const isDismissing = qfDismissing.has(row.question_identifier);
                    const isDeleting = qfDeleting.has(row.question_identifier);
                    const isSyllogism = row.question_kind === "dm_syllogism";
                    const reports = individualReports(row.question_identifier);
                    const isHidden =
                      qfOverrides.get(overrideKeyForIdentifier(row.question_identifier))?.is_hidden === true;
                    const isHiding = qfHiding.has(row.question_identifier);
                    const resolved = qfResolved.get(row.question_identifier);
                    return (
                      <>
                        <tr key={key} className="border-b border-border hover:bg-secondary">
                          <td className="px-3 py-2 text-foreground whitespace-nowrap">
                            {row.trainer_type.replace(/_/g, " ")}
                          </td>
                          <td className="px-3 py-2">
                            <p className="text-foreground font-mono text-xs">{row.question_identifier}</p>
                            {isHidden && (
                              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase tracking-wide">
                                Hidden from students
                              </span>
                            )}
                            {row.passage_id && (
                              <p className="text-muted-foreground text-xs">Passage: {row.passage_id}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-foreground">
                            {row.total}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {row.issues.wrong_answer || "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {row.issues.unclear_wording || "-"}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground whitespace-nowrap">
                            {new Date(row.last_created_at).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isExpanded) ensureResolved(row.question_identifier);
                                  setExpandedQF((prev) => {
                                    const next = new Set(prev);
                                    if (isExpanded) { next.delete(row.question_identifier); } else { next.add(row.question_identifier); }
                                    return next;
                                  });
                                }}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-border text-foreground hover:bg-secondary"
                              >
                                {isExpanded ? "Collapse" : "View question"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleHide(
                                    row.question_identifier,
                                    row.question_kind,
                                    row.trainer_type,
                                    !isHidden,
                                  )
                                }
                                disabled={isHiding}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isHidden
                                    ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                                    : "border-red-200 text-red-700 hover:bg-red-50"
                                }`}
                              >
                                {isHiding ? "Saving…" : isHidden ? "Unhide" : "Hide from students"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDismissQuestionFeedback(row.question_identifier)}
                                disabled={isDismissing || isDeleting}
                                className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-border text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isDismissing ? "Dismissing…" : "Dismiss all"}
                              </button>
                              {isSyllogism && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!window.confirm(`Delete this question from the question bank? This cannot be undone.\n\n${row.question_identifier}`)) return;
                                    handleDeleteQuestion(row.question_kind, row.question_identifier, row.trainer_type);
                                  }}
                                  disabled={isDismissing || isDeleting}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isDeleting ? "Deleting…" : "Delete question"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${key}--expanded`} className="bg-secondary border-b border-border">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="mb-3 rounded-lg border border-border bg-white p-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                  Flagged question
                                </p>
                                {resolved === undefined || resolved === "loading" ? (
                                  <p className="text-xs text-muted-foreground">Loading question…</p>
                                ) : !resolved.resolved ? (
                                  <p className="text-xs text-amber-700">
                                    {resolved.message ?? "Could not resolve this question."}
                                  </p>
                                ) : (
                                  <div className="space-y-2 text-xs text-foreground">
                                    {resolved.title && <p className="font-semibold">{resolved.title}</p>}
                                    {resolved.passageText && (
                                      <details className="rounded border border-border bg-secondary/40 p-2">
                                        <summary className="cursor-pointer text-muted-foreground">Passage text</summary>
                                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{resolved.passageText}</p>
                                      </details>
                                    )}
                                    {resolved.stem && (
                                      <p><span className="text-muted-foreground">Stem: </span>{resolved.stem}</p>
                                    )}
                                    {resolved.question && (
                                      <p><span className="text-muted-foreground">Question: </span>{resolved.question}</p>
                                    )}
                                    {resolved.highlightText && (
                                      <p>
                                        <span className="text-muted-foreground">Correct span: </span>
                                        <mark className="bg-green-100">{resolved.highlightText}</mark>
                                      </p>
                                    )}
                                    {resolved.options && resolved.options.length > 0 && (
                                      <ul className="space-y-1">
                                        {resolved.options.map((opt, i) => (
                                          <li
                                            key={i}
                                            className={`rounded border px-2 py-1 ${opt.correct ? "border-green-300 bg-green-50" : "border-border"}`}
                                          >
                                            {opt.id && <span className="font-semibold mr-1">{opt.id}.</span>}
                                            {opt.text}
                                            {opt.correct && <span className="ml-2 text-green-700 font-medium">✓ correct</span>}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {resolved.correctAnswer && (
                                      <p>
                                        <span className="text-muted-foreground">Correct answer: </span>
                                        <span className="font-medium">{resolved.correctAnswer}</span>
                                      </p>
                                    )}
                                    {resolved.explanation && (
                                      <p><span className="text-muted-foreground">Explanation: </span>{resolved.explanation}</p>
                                    )}
                                    {resolved.kind === "distortion" && resolved.message && (
                                      <p className="text-muted-foreground italic">{resolved.message}</p>
                                    )}
                                    {resolved.extra && Object.keys(resolved.extra).length > 0 && (
                                      <p className="text-muted-foreground">
                                        {Object.entries(resolved.extra)
                                          .filter(([, v]) => v)
                                          .map(([k, v]) => `${k}: ${v}`)
                                          .join(" · ")}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {resolved &&
                                  resolved !== "loading" &&
                                  resolved.resolved &&
                                  resolved.kind !== "distortion" &&
                                  (qfEditing === row.question_identifier ? (
                                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                                      {Object.keys(qfEditForm).map((k) => (
                                        <label key={k} className="block">
                                          <span className="text-[11px] font-medium text-muted-foreground">
                                            {prettyFieldLabel(k)}
                                          </span>
                                          <textarea
                                            value={qfEditForm[k]}
                                            onChange={(e) =>
                                              setQfEditForm((f) => ({ ...f, [k]: e.target.value }))
                                            }
                                            rows={k === "correctAnswer" ? 1 : 2}
                                            className="mt-0.5 w-full rounded border border-border px-2 py-1 text-xs"
                                          />
                                        </label>
                                      ))}
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            saveEditQuestion(
                                              row.question_identifier,
                                              resolved,
                                              row.question_kind,
                                              row.trainer_type,
                                            )
                                          }
                                          disabled={qfSaving.has(row.question_identifier)}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-primary bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                        >
                                          {qfSaving.has(row.question_identifier) ? "Saving…" : "Save override"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setQfEditing(null)}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-border text-foreground hover:bg-secondary"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        Saves a reversible override — students see the edited version immediately; the original question is left untouched.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-3 border-t border-border pt-3 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => startEditQuestion(row.question_identifier, resolved)}
                                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium border border-border text-foreground hover:bg-secondary"
                                      >
                                        Edit question
                                      </button>
                                      {qfOverrides.get(overrideKeyForIdentifier(row.question_identifier))?.override && (
                                        <span className="text-[11px] text-amber-700 font-medium">
                                          ✏️ Edited — students see an override
                                        </span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Individual reports ({reports.length})
                              </p>
                              {reports.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No reports found.</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {reports.map((rep) => (
                                    <li key={rep.id} className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary text-foreground font-medium mr-2">
                                        {rep.issue_type.replace(/_/g, " ")}
                                      </span>
                                      {rep.comment && <span className="text-foreground">{rep.comment}</span>}
                                      <span className="ml-2 text-muted-foreground">
                                        {new Date(rep.created_at).toLocaleString()}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}</>
        )}
      </div>
    </section>
  );
}
