export type AdminUserRow = {
  user_id: string;
  email: string;
  display_name?: string;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct?: number;
  session_questions?: number;
  total_time_seconds?: number;
  days_active?: number;
  last_wpm?: number | null;
  avg_wpm?: number | null;
  last_active_at: string | null;
};

type UserSortKey = keyof AdminUserRow | "accuracy";

function formatTimeSeconds(seconds: number | undefined | null): string {
  if (seconds == null || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
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

function filterAndSortUsers(
  users: AdminUserRow[],
  sortKey: UserSortKey,
  sortDir: "asc" | "desc",
  minQuestions: number,
  emailQuery: string
): AdminUserRow[] {
  let out = users.filter(
    (u) =>
      u.total_questions >= minQuestions &&
      (emailQuery === "" || (u.email && u.email.toLowerCase().includes(emailQuery.toLowerCase())))
  );
  out = [...out].sort((a, b) => {
    let aVal: string | number | null | undefined;
    let bVal: string | number | null | undefined;
    if (sortKey === "accuracy") {
      const aDen = a.session_questions ?? 0;
      const bDen = b.session_questions ?? 0;
      aVal = aDen > 0 ? ((a.session_correct ?? 0) / aDen) * 100 : null;
      bVal = bDen > 0 ? ((b.session_correct ?? 0) / bDen) * 100 : null;
    } else {
      aVal = a[sortKey];
      bVal = b[sortKey];
    }
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDir === "asc" ? -1 : 1;
    if (bVal == null) return sortDir === "asc" ? 1 : -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      const c = aVal.localeCompare(bVal);
      return sortDir === "asc" ? c : -c;
    }
    const n = (aVal as number) - (bVal as number);
    return sortDir === "asc" ? n : -n;
  });
  return out;
}

const USER_TABLE_COLUMNS: { key: UserSortKey; label: string }[] = [
  { key: "display_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "last_active_at", label: "Last access" },
  { key: "total_questions", label: "Questions" },
  { key: "accuracy", label: "Accuracy %" },
  { key: "total_time_seconds", label: "Time spent" },
  { key: "days_active", label: "Days active" },
  { key: "last_wpm", label: "WPM (last)" },
  { key: "speed_reading", label: "Speed reading" },
  { key: "rapid_recall", label: "Rapid recall" },
  { key: "keyword_scanning", label: "Keyword scanning" },
  { key: "calculator", label: "Calculator" },
  { key: "inference_trainer", label: "Inference" },
  { key: "mental_maths", label: "Mental maths" },
  { key: "syllogism_micro", label: "Syllogism micro" },
  { key: "syllogism_macro", label: "Syllogism macro" },
];

type AdminPerUserActivitySectionProps = {
  users: AdminUserRow[];
  userSortKey: UserSortKey;
  setUserSortKey: (k: UserSortKey) => void;
  userSortDir: "asc" | "desc";
  setUserSortDir: (fn: (d: "asc" | "desc") => "asc" | "desc") => void;
  userFilterMinQuestions: number;
  setUserFilterMinQuestions: (n: number) => void;
  userFilterEmail: string;
  setUserFilterEmail: (v: string) => void;
};

export default function AdminPerUserActivitySection({
  users,
  userSortKey,
  setUserSortKey,
  userSortDir,
  setUserSortDir,
  userFilterMinQuestions,
  setUserFilterMinQuestions,
  userFilterEmail,
  setUserFilterEmail,
}: AdminPerUserActivitySectionProps) {
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-foreground">Per-user activity</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">
            Min questions:{" "}
            <input
              type="number"
              min={0}
              value={userFilterMinQuestions}
              onChange={(e) => setUserFilterMinQuestions(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-20 px-2 py-1 border border-border rounded text-foreground"
            />
          </label>
          <input
            type="search"
            placeholder="Filter by email"
            value={userFilterEmail}
            onChange={(e) => setUserFilterEmail(e.target.value)}
            className="min-w-[160px] px-3 py-2 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => {
              const filtered = filterAndSortUsers(users, userSortKey, userSortDir, userFilterMinQuestions, userFilterEmail);
              const headers = ["display_name", "email", "last_active_at", "total_questions", "session_correct", "session_questions", "accuracy_pct", "total_time_seconds", "time_formatted", "days_active", "last_wpm", "avg_wpm", "speed_reading", "rapid_recall", "keyword_scanning", "calculator", "inference_trainer", "mental_maths", "syllogism_micro", "syllogism_macro"];
              const escape = (v: string | number | null) => {
                if (v == null) return "";
                const s = String(v);
                if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
                return s;
              };
              const toCell = (val: unknown): string | number | null =>
                val === null || val === undefined ? null : typeof val === "string" || typeof val === "number" ? val : String(val);
              const rows = filtered.map((u) => {
                const acc = (u.session_questions ?? 0) > 0 ? ((u.session_correct ?? 0) / (u.session_questions ?? 1) * 100).toFixed(1) : "";
                const row: Record<string, string | number | null> = {
                  display_name: u.display_name || "",
                  email: u.email || "",
                  last_active_at: u.last_active_at ?? "",
                  total_questions: u.total_questions,
                  session_correct: u.session_correct ?? "",
                  session_questions: u.session_questions ?? "",
                  accuracy_pct: acc,
                  total_time_seconds: u.total_time_seconds ?? "",
                  time_formatted: formatTimeSeconds(u.total_time_seconds),
                  days_active: u.days_active ?? "",
                  last_wpm: u.last_wpm ?? "",
                  avg_wpm: u.avg_wpm ?? "",
                  speed_reading: u.speed_reading,
                  rapid_recall: u.rapid_recall,
                  keyword_scanning: u.keyword_scanning,
                  calculator: u.calculator,
                  inference_trainer: u.inference_trainer,
                  mental_maths: u.mental_maths,
                  syllogism_micro: u.syllogism_micro,
                  syllogism_macro: u.syllogism_macro,
                };
                return headers.map((h) => escape(toCell(row[h]))).join(",");
              });
              downloadText("admin-users-export.csv", [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
            }}
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-secondary">
              {USER_TABLE_COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  className="px-2 py-2 text-left font-medium text-foreground whitespace-nowrap cursor-pointer hover:bg-secondary"
                  onClick={() => {
                    if (userSortKey === key) setUserSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    else setUserSortKey(key);
                  }}
                >
                  {label}
                  {userSortKey === key ? (userSortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filterAndSortUsers(users, userSortKey, userSortDir, userFilterMinQuestions, userFilterEmail).map((u) => (
              <tr key={u.user_id} className="border-b border-border hover:bg-secondary">
                {USER_TABLE_COLUMNS.map(({ key }) => {
                  if (key === "display_name") return <td key={key} className="px-2 py-2 text-foreground font-medium">{u.display_name || "-"}</td>;
                  if (key === "email") return <td key={key} className="px-2 py-2 text-foreground">{u.email || "-"}</td>;
                  if (key === "last_active_at") return <td key={key} className="px-2 py-2 text-muted-foreground text-xs">{u.last_active_at ? new Date(u.last_active_at).toLocaleString() : "-"}</td>;
                  if (key === "accuracy") {
                    const total = u.session_questions ?? 0;
                    const correct = u.session_correct ?? 0;
                    const pct = total > 0 ? ((correct / total) * 100).toFixed(1) : "-";
                    return <td key={key} className="px-2 py-2 text-right">{pct}</td>;
                  }
                  if (key === "total_time_seconds") return <td key={key} className="px-2 py-2 text-right text-foreground">{formatTimeSeconds(u.total_time_seconds)}</td>;
                  if (key === "days_active") return <td key={key} className="px-2 py-2 text-right">{u.days_active ?? "-"}</td>;
                  if (key === "last_wpm") return <td key={key} className="px-2 py-2 text-right">{u.last_wpm != null ? u.last_wpm : "-"}</td>;
                  const val = u[key];
                  const num = typeof val === "number" ? val : null;
                  return <td key={key} className="px-2 py-2 text-right">{num != null ? num : "-"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {filterAndSortUsers(users, userSortKey, userSortDir, userFilterMinQuestions, userFilterEmail).length === 0 && (
          <p className="px-4 py-6 text-muted-foreground text-center">No users match the filters.</p>
        )}
      </div>
    </section>
  );
}
