import { Lock, Sparkles } from "lucide-react";

export default function LockedDashboardPreview({
  onCreateAccount,
  onSignIn,
}: {
  onCreateAccount: () => void;
  onSignIn: () => void;
}) {
  const teaserStats = [
    { label: "Predicted weak area", value: "QR conversions", helper: "From accuracy trends" },
    { label: "7-day consistency", value: "5/7 days", helper: "Daily practice map" },
    { label: "Best recent score", value: "86%", helper: "Across all trainers" },
    { label: "WPM trajectory", value: "+42", helper: "Last 3 sessions" },
  ];
  const chartBars = [38, 48, 44, 58, 63, 71, 78, 74, 83, 88];
  const weakAreas = [
    { label: "Unit conversions", value: 42, color: "bg-foreground" },
    { label: "Inference evidence", value: 57, color: "bg-muted-foreground" },
    { label: "SJT appropriateness", value: 69, color: "bg-primary" },
  ];
  const activityRows = [
    ["Today", "Mental Maths", "78%"],
    ["Yesterday", "Decision Making", "82%"],
    ["Mon", "Keyword Scanning", "91%"],
    ["Sun", "SJT Ranking", "Band 1"],
  ];

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Free account preview
            </p>
            <h2 className="mt-3 text-xl font-bold text-foreground">
              See the dashboard your sessions build.
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Sign up free to unlock trends, weak-area tracking, recent activity, planner links and cross-device progress.
            </p>
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none select-none blur-[3px] sm:blur-[4px]"
            aria-hidden="true"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teaserStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-secondary p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.helper}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-xl border border-border bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">WPM and accuracy trend</p>
                    <p className="text-xs text-muted-foreground">Last 10 saved sessions</p>
                  </div>
                  <span className="rounded-full bg-secondary border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Improving
                  </span>
                </div>
                <div className="flex h-44 items-end gap-2 rounded-lg bg-secondary px-3 py-3">
                  {chartBars.map((height, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full rounded-t-md bg-primary"
                        style={{ height: `${height}%` }}
                      />
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-4">
                <p className="text-sm font-semibold text-foreground">Weak-area breakdown</p>
                <p className="mb-4 text-xs text-muted-foreground">Know what to practise next.</p>
                <div className="space-y-4">
                  {weakAreas.map((area) => (
                    <div key={area.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{area.label}</span>
                        <span className="text-muted-foreground">{area.value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className={`h-full rounded-full ${area.color}`} style={{ width: `${area.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Trainer</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map(([date, trainer, score]) => (
                    <tr key={`${date}-${trainer}`} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground">{date}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{trainer}</td>
                      <td className="px-4 py-3 text-foreground">{score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="absolute -top-20 bottom-0 inset-x-0 flex items-start justify-center bg-white/55 px-4 pt-8 backdrop-blur-[1px] sm:pt-10">
            <div className="max-w-md rounded-xl border border-border bg-white p-5 text-center shadow-lg">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Unlock your full progress dashboard.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Free account. Saved history. Better next-step recommendations.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onCreateAccount}
                  className="min-h-[44px] rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create free account
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="min-h-[44px] rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
