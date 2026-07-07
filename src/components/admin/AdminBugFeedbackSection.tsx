type FeedbackRow = {
  id: string;
  user_id: string | null;
  type: "bug" | "suggestion";
  description: string;
  page_url: string | null;
  created_at: string;
  archived_at: string | null;
};

type FeedbackFilter = "all" | "bug" | "suggestion";
type FeedbackView = "active" | "archived";

function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFeedbackCsv(feedback: FeedbackRow[]): void {
  const headers = ["id", "type", "description", "page_url", "created_at"];
  const escape = (v: string | null) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = feedback.map((r) =>
    [r.id, r.type, escape(r.description), escape(r.page_url), r.created_at].join(",")
  );
  downloadText("feedback-export.csv", [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
}

function exportFeedbackJson(feedback: FeedbackRow[]): void {
  downloadText(
    "feedback-export.json",
    JSON.stringify(feedback, null, 2),
    "application/json"
  );
}

type AdminBugFeedbackSectionProps = {
  feedback: FeedbackRow[];
  feedbackFilter: FeedbackFilter;
  setFeedbackFilter: (f: FeedbackFilter) => void;
  feedbackView: FeedbackView;
  setFeedbackView: (v: FeedbackView) => void;
  isFeedbackUpdating: (id: string) => boolean;
  handleArchiveToggle: (id: string, shouldArchive: boolean) => void;
};

export default function AdminBugFeedbackSection({
  feedback,
  feedbackFilter,
  setFeedbackFilter,
  feedbackView,
  setFeedbackView,
  isFeedbackUpdating,
  handleArchiveToggle,
}: AdminBugFeedbackSectionProps) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-foreground">Bugs & feedback</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5 bg-secondary">
            {(["active", "archived"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setFeedbackView(view)}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  feedbackView === view
                    ? "bg-white text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {view === "active" ? "Active" : "Archived"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              exportFeedbackCsv(
                feedback
                  .filter((r) =>
                    feedbackView === "active" ? r.archived_at == null : r.archived_at != null
                  )
                  .filter((r) => feedbackFilter === "all" || r.type === feedbackFilter)
              )
            }
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportFeedbackJson(
                feedback
                  .filter((r) =>
                    feedbackView === "active" ? r.archived_at == null : r.archived_at != null
                  )
                  .filter((r) => feedbackFilter === "all" || r.type === feedbackFilter)
              )
            }
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
          >
            Export JSON
          </button>
          <div className="flex rounded-lg border border-border p-0.5 bg-secondary">
          {(["all", "bug", "suggestion"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFeedbackFilter(f)}
              className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                feedbackFilter === f
                  ? "bg-white text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "bug" ? "Bugs" : "Suggestions"}
            </button>
          ))}
          </div>
        </div>
      </div>
      {(() => {
        const visibleFeedback = feedback
          .filter((r) => (feedbackView === "active" ? r.archived_at == null : r.archived_at != null))
          .filter((r) => feedbackFilter === "all" || r.type === feedbackFilter);
        if (visibleFeedback.length === 0) {
          return (
            <p className="text-muted-foreground">
              {feedbackView === "active" ? "No feedback yet." : "No archived feedback."}
            </p>
          );
        }
        return (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <ul className="divide-y divide-slate-200">
              {visibleFeedback.map((r) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        r.type === "bug"
                          ? "bg-red-100 text-red-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.type === "bug" ? "Bug" : "Suggestion"}
                    </span>
                    {r.archived_at && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">
                        Archived
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleArchiveToggle(r.id, !r.archived_at)}
                      disabled={isFeedbackUpdating(r.id)}
                      className="ml-auto inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border border-border text-foreground hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isFeedbackUpdating(r.id)
                        ? "Saving…"
                        : r.archived_at
                        ? "Unarchive"
                        : "Archive"}
                    </button>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{r.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.page_url && <span>{r.page_url} · </span>}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </section>
  );
}
