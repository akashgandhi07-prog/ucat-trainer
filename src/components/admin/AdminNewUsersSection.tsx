export type NewUserRow = {
  user_id: string;
  full_name: string | null;
  created_at: string;
  email: string;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct: number;
  event_counts: Record<string, number>;
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
              const sessions: string[] = [];
              if (row.speed_reading) sessions.push(`${row.speed_reading} speed reading`);
              if (row.rapid_recall) sessions.push(`${row.rapid_recall} rapid recall`);
              if (row.keyword_scanning) sessions.push(`${row.keyword_scanning} keyword scanning`);
              if (row.calculator) sessions.push(`${row.calculator} calculator`);
              if (row.inference_trainer) sessions.push(`${row.inference_trainer} inference`);
              if (row.mental_maths) sessions.push(`${row.mental_maths} mental maths`);
              if (row.syllogism_micro) sessions.push(`${row.syllogism_micro} syllogism micro`);
              if (row.syllogism_macro) sessions.push(`${row.syllogism_macro} syllogism macro`);
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
              const sessions: string[] = [];
              if (row.speed_reading) sessions.push(`${row.speed_reading} speed reading`);
              if (row.rapid_recall) sessions.push(`${row.rapid_recall} rapid recall`);
              if (row.keyword_scanning) sessions.push(`${row.keyword_scanning} keyword scanning`);
              if (row.calculator) sessions.push(`${row.calculator} calculator`);
              if (row.inference_trainer) sessions.push(`${row.inference_trainer} inference`);
              if (row.mental_maths) sessions.push(`${row.mental_maths} mental maths`);
              if (row.syllogism_micro) sessions.push(`${row.syllogism_micro} syllogism micro`);
              if (row.syllogism_macro) sessions.push(`${row.syllogism_macro} syllogism macro`);
              const activityParts = [
                eventParts.length ? eventParts.join("; ") : null,
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
