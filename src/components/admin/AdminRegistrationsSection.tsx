export type RegistrationRow = {
  user_id: string;
  email: string;
  display_name?: string;
  stream?: string | null;
  entry_year?: string | null;
  created_at: string | null;
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
  trainer_questions?: Record<string, number>;
  trainer_time_seconds?: Record<string, number>;
  days_active?: number;
  last_wpm?: number | null;
  avg_wpm?: number | null;
  last_active_at: string | null;
};

export type RegistrationSortKey = keyof RegistrationRow;

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

function filterAndSortRegistrations(
  rows: RegistrationRow[],
  sortKey: RegistrationSortKey,
  sortDir: "asc" | "desc",
  query: string
): RegistrationRow[] {
  const trimmedQuery = query.trim().toLowerCase();
  let out = rows;
  if (trimmedQuery) {
    out = rows.filter((r) => {
      const name = (r.display_name ?? "").toLowerCase();
      const email = (r.email ?? "").toLowerCase();
      return name.includes(trimmedQuery) || email.includes(trimmedQuery);
    });
  }
  out = [...out].sort((a, b) => {
    const aVal = a[sortKey] as string | number | null | undefined;
    const bVal = b[sortKey] as string | number | null | undefined;
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

const REGISTRATION_TABLE_COLUMNS: { key: RegistrationSortKey; label: string }[] = [
  { key: "display_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "created_at", label: "Registered on" },
  { key: "last_active_at", label: "Last active" },
  { key: "days_active", label: "Days active" },
  { key: "total_questions", label: "Questions" },
  { key: "total_time_seconds", label: "Time spent" },
  { key: "speed_reading", label: "Speed reading" },
  { key: "rapid_recall", label: "Rapid recall" },
  { key: "keyword_scanning", label: "Keyword scanning" },
  { key: "calculator", label: "Calculator" },
  { key: "inference_trainer", label: "Inference" },
  { key: "mental_maths", label: "Mental maths" },
  { key: "syllogism_micro", label: "Syllogism micro" },
  { key: "syllogism_macro", label: "Syllogism macro" },
];

type AdminRegistrationsSectionProps = {
  registrations: RegistrationRow[];
  registrationSortKey: RegistrationSortKey;
  setRegistrationSortKey: (k: RegistrationSortKey) => void;
  registrationSortDir: "asc" | "desc";
  setRegistrationSortDir: (fn: (d: "asc" | "desc") => "asc" | "desc") => void;
  registrationFilterQuery: string;
  setRegistrationFilterQuery: (v: string) => void;
};

export default function AdminRegistrationsSection({
  registrations,
  registrationSortKey,
  setRegistrationSortKey,
  registrationSortDir,
  setRegistrationSortDir,
  registrationFilterQuery,
  setRegistrationFilterQuery,
}: AdminRegistrationsSectionProps) {
  if (registrations.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">All registrations (students)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All registered users across all time, with per-trainer usage. Guest usage is shown separately below as
            {" "}“Guest activity (anon)”.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Filter by name or email"
            value={registrationFilterQuery}
            onChange={(e) => setRegistrationFilterQuery(e.target.value)}
            className="min-w-[200px] px-3 py-2 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => {
              const headers = REGISTRATION_TABLE_COLUMNS.map((c) => c.label.toLowerCase().replace(/\s+/g, "_"));
              const rows = filterAndSortRegistrations(
                registrations,
                registrationSortKey,
                registrationSortDir,
                registrationFilterQuery
              ).map((r) => {
                const escape = (v: string | number | null) => {
                  if (v == null) return "";
                  const s = String(v);
                  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, "\"\"")}"`;
                  return s;
                };
                const formatDate = (value: string | null, withTime: boolean) => {
                  if (!value) return "";
                  const d = new Date(value);
                  return withTime
                    ? d.toLocaleString()
                    : d.toLocaleDateString(undefined, { dateStyle: "medium" });
                };
                const row: Record<string, string | number | null> = {
                  name: r.display_name || "",
                  email: r.email || "",
                  registered_on: formatDate(r.created_at, false),
                  last_active: formatDate(r.last_active_at, true),
                  days_active: r.days_active ?? null,
                  total_questions: r.total_questions,
                  total_time_seconds: r.total_time_seconds ?? null,
                  speed_reading: r.speed_reading,
                  rapid_recall: r.rapid_recall,
                  keyword_scanning: r.keyword_scanning,
                  calculator: r.calculator,
                  inference_trainer: r.inference_trainer,
                  mental_maths: r.mental_maths,
                  syllogism_micro: r.syllogism_micro,
                  syllogism_macro: r.syllogism_macro,
                };
                return headers.map((h) => escape(row[h])).join(",");
              });
              downloadText(
                "admin-registrations-export.csv",
                [headers.join(","), ...rows].join("\n"),
                "text/csv;charset=utf-8"
              );
            }}
            className="min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border border-border bg-white text-foreground hover:bg-secondary transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-secondary">
              {REGISTRATION_TABLE_COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  className="px-2 py-2 text-left font-medium text-foreground whitespace-nowrap cursor-pointer hover:bg-secondary"
                  onClick={() => {
                    if (registrationSortKey === key) {
                      setRegistrationSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setRegistrationSortKey(key);
                    }
                  }}
                >
                  {label}
                  {registrationSortKey === key ? (registrationSortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filterAndSortRegistrations(
              registrations,
              registrationSortKey,
              registrationSortDir,
              registrationFilterQuery
            ).map((r) => (
              <tr key={r.user_id} className="border-b border-border hover:bg-secondary">
                {REGISTRATION_TABLE_COLUMNS.map(({ key }) => {
                  if (key === "display_name") {
                    return (
                      <td key={key} className="px-2 py-2 text-foreground font-medium">
                        {r.display_name || "-"}
                      </td>
                    );
                  }
                  if (key === "email") {
                    return (
                      <td key={key} className="px-2 py-2 text-foreground">
                        {r.email || "-"}
                      </td>
                    );
                  }
                  if (key === "created_at") {
                    return (
                      <td key={key} className="px-2 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "-"}
                      </td>
                    );
                  }
                  if (key === "last_active_at") {
                    return (
                      <td key={key} className="px-2 py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {r.last_active_at ? new Date(r.last_active_at).toLocaleString() : "-"}
                      </td>
                    );
                  }
                  if (key === "total_time_seconds") {
                    return (
                      <td key={key} className="px-2 py-2 text-right text-foreground">
                        {formatTimeSeconds(r.total_time_seconds)}
                      </td>
                    );
                  }
                  if (key === "days_active") {
                    return (
                      <td key={key} className="px-2 py-2 text-right">
                        {r.days_active ?? "-"}
                      </td>
                    );
                  }
                  const val = r[key];
                  const num = typeof val === "number" ? val : null;
                  return (
                    <td key={key} className="px-2 py-2 text-right">
                      {num != null ? num : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
