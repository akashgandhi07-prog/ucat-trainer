export type SJTQualityRow = {
  question_id: string;
  question_type: string;
  answer_changes: number;
  explanation_opens: number;
  abandons: number;
  reports: number;
  signal_total: number;
};

/** ok: RPC answered; missing: RPC not deployed; error: RPC failed for another reason. */
export type SJTQualityStatus = "ok" | "missing" | "error";

export default function AdminSJTQualitySection({ rows, status = "ok" }: { rows: SJTQualityRow[]; status?: SJTQualityStatus }) {
  return <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="sjt-quality-title">
    <h2 id="sjt-quality-title" className="text-lg font-semibold text-foreground">SJT question-quality signals</h2>
    <p className="mt-1 text-sm text-muted-foreground">Prioritises questions with answer changes, abandonment and direct reports. Signals identify questions to review; they do not prove an answer is wrong.</p>
    {status === "missing" ? <p role="status" className="mt-4 text-sm text-amber-700">SJT quality function isn't installed yet. Apply migration 20260924121000_admin_sjt_quality_signals.sql in the Supabase SQL editor.</p>
    : status === "error" ? <p role="status" className="mt-4 text-sm text-destructive">SJT quality signals could not be loaded. Check the console for details and try again.</p>
    : rows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="border-b border-border text-left"><th className="p-2">Question</th><th className="p-2">Type</th><th className="p-2 text-right">Changes</th><th className="p-2 text-right">Explanations</th><th className="p-2 text-right">Abandoned</th><th className="p-2 text-right">Reports</th></tr></thead>
      <tbody>{rows.slice(0, 25).map((row) => <tr key={`${row.question_type}:${row.question_id}`} className="border-b border-border/60">
        <td className="p-2 font-medium text-foreground">{row.question_id}</td><td className="p-2 capitalize">{row.question_type}</td><td className="p-2 text-right">{row.answer_changes}</td><td className="p-2 text-right">{row.explanation_opens}</td><td className="p-2 text-right">{row.abandons}</td><td className="p-2 text-right">{row.reports}</td>
      </tr>)}</tbody>
    </table></div> : <p className="mt-4 text-sm text-muted-foreground">No SJT quality signals in this date range.</p>}
  </section>;
}
