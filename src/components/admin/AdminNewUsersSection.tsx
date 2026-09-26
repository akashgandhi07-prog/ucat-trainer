import { ADMIN_TRAINER_KEYS, adminTrainerLabel, trainerSessionCounts, type SessionCounts } from "./adminTrainerTypes";

/** Rows are normalised with withSessionCounts, so every training type has a numeric field. */
export type NewUserRow = SessionCounts & {
  user_id: string;
  full_name: string | null;
  created_at: string;
  email: string;
  sessions_by_type?: Partial<Record<string, number>>;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct: number;
  event_counts: Record<string, number>;
  /**
   * Optional (added by supabase/pending/0001_admin_new_users_7day.sql). Raw analytics
   * rows are kept for 7 days and the daily rollup has no user grain, so event_counts
   * only cover events on/after event_counts_since. event_counts_partial is true when
   * the user signed up before that cut-off.
   */
  event_counts_since?: string | null;
  event_counts_partial?: boolean;
};

/** Human-readable labels for analytics event names (so admins know what each event means). */
const EVENT_LABELS: Record<string, string> = {
  page_view: "Page views",
  trainer_opened: "Trainer page opened",
  trainer_started: "Drill started",
  trainer_completed: "Drill completed",
  trainer_abandoned: "Drill abandoned (left mid-session)",
  trainer_mode_selected: "Calculator mode selected",
  dashboard_viewed: "Dashboard viewed",
  dashboard_loaded: "Dashboard loaded",
  sign_in: "Sign in",
  sign_out: "Sign out",
  sign_up: "Sign up",
  auth_modal_opened: "Auth modal opened",
  shortcuts_opened: "Calculator shortcuts opened",
  bug_report_opened: "Bug report / feedback opened",
};

/** "3 Speed Reading; 1 QR Setup Trainer" style summary of the sessions a user has logged. */
function sessionSummary(row: NewUserRow): string[] {
  const counts = trainerSessionCounts(row);
  return ADMIN_TRAINER_KEYS.filter((key) => counts[key] > 0).map((key) => `${counts[key]} ${adminTrainerLabel(key)}`);
}

function downloadText(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type AdminNewUsersSectionProps = {
  newUsers: NewUserRow[];
};

export default function AdminNewUsersSection({ newUsers }: AdminNewUsersSectionProps) {
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-foreground">New users by date</h2>
        <button
          type="button"
          onClick={() => {
            const headers = ["Date", "Full name", "Email", "Activity"];
            const escape = (v: string | null) => {
              if (v == null) return "";
              const s = String(v);
              if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
              return s;
            };
            const rows = newUsers.map((row) => {
              const eventParts = Object.entries(row.event_counts ?? {})
                .filter(([, n]) => n > 0)
                .map(([name, n]) => `${EVENT_LABELS[name] ?? name.replace(/_/g, " ")}: ${n}`);
              const sessions = sessionSummary(row);
              const activityParts = [
                eventParts.length ? eventParts.join("; ") : "",
                sessions.length ? `Sessions: ${sessions.join("; ")}` : null,
                row.total_questions > 0 ? `${row.total_questions} questions answered` : null,
              ].filter(Boolean);
              const activityText = activityParts.join(" · ") || "-";
              const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-";
              return [dateStr, row.full_name || "-", row.email || "-", activityText].map(escape).join(",");
            });
            downloadText("new-users-by-date.csv", [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
          }}
          className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
        >
          Export CSV
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        Sign-ups in the selected date range, with full name and what they&apos;ve looked at and done (page views, drills, sessions).
        Page-view and drill-started counts come from raw analytics, which is kept for 7 days; session and question counts are complete.
      </p>
      {newUsers.length > 0 && (
        <p className="text-sm text-foreground mb-4">
          {(() => {
            const activated = newUsers.filter((u) => u.total_questions > 0).length;
            const total = newUsers.length;
            const pct = total ? ((activated / total) * 100).toFixed(1) : "0";
            return `${pct}% of new sign-ups in this range completed at least one drill (${activated} of ${total}).`;
          })()}
        </p>
      )}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-secondary">
              <th className="px-4 py-2 text-left font-medium text-foreground">Date</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Full name</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Email</th>
              <th className="px-4 py-2 text-left font-medium text-foreground">Activity</th>
            </tr>
          </thead>
          <tbody>
            {newUsers.map((row) => {
              const eventParts = Object.entries(row.event_counts ?? {})
                .filter(([, n]) => n > 0)
                .map(([name, n]) => `${EVENT_LABELS[name] ?? name.replace(/_/g, " ")}: ${n}`);
              const sessions = sessionSummary(row);
              const eventsLabel = row.event_counts_partial && row.event_counts_since
                ? `Events since ${new Date(row.event_counts_since).toLocaleDateString(undefined, { dateStyle: "medium" })}: `
                : "";
              const activityParts = [
                eventParts.length ? `${eventsLabel}${eventParts.join("; ")}` : null,
                sessions.length ? `Sessions: ${sessions.join("; ")}` : null,
                row.total_questions > 0 ? `${row.total_questions} questions answered` : null,
              ].filter(Boolean);
              const activityText = activityParts.length ? activityParts.join(" · ") : "-";
              return (
                <tr key={row.user_id} className="border-b border-border hover:bg-secondary">
                  <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-"}
                  </td>
                  <td className="px-4 py-2 text-foreground font-medium">
                    {row.full_name || "-"}
                  </td>
                  <td className="px-4 py-2 text-foreground truncate max-w-[200px]" title={row.email || ""}>
                    {row.email || "-"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs max-w-[400px]">
                    {activityText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {newUsers.length === 0 && (
          <p className="px-4 py-6 text-muted-foreground text-center">No new users in this date range.</p>
        )}
      </div>
    </section>
  );
}
