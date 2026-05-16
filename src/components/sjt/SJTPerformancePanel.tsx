import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, RotateCcw } from "lucide-react";
import { getSJTStats, clearSJTData } from "../../lib/sjtAnalytics";
import { GMC_DOMAINS } from "../../data/gmcDomains";
import type { GMCDomainId } from "../../types/sjt";
import { cn } from "../../lib/cn";

const dotColor: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
};

const barColor: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
};

function pctLabel(pct: number): { text: string; color: string } {
  if (pct >= 80) return { text: "Strong", color: "text-training-success" };
  if (pct >= 60) return { text: "Developing", color: "text-amber-600" };
  return { text: "Needs work", color: "text-destructive" };
}

type Props = {
  /** Re-render trigger so the panel refreshes after each quiz */
  refreshKey?: number;
  onClear?: () => void;
};

export default function SJTPerformancePanel({ refreshKey: _refreshKey, onClear }: Props) {
  const stats = useMemo(() => getSJTStats(), [_refreshKey]);

  if (!stats) return null;

  const allDomainIds: GMCDomainId[] = [
    "knowledge_skills_development",
    "patients_partnership_communication",
    "colleagues_culture_safety",
    "trust_professionalism",
  ];

  function handleClear() {
    if (window.confirm("Clear all SJT performance data?")) {
      clearSJTData();
      onClear?.();
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Based on {stats.totalAttempts} scenario{stats.totalAttempts !== 1 ? "s" : ""} completed.
            Overall: <span className="font-semibold text-foreground">{stats.pct}%</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" aria-hidden />
          Reset data
        </button>
      </div>

      {/* Domain bars */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {allDomainIds.map((domainId) => {
          const domain = GMC_DOMAINS[domainId];
          const domainStat = stats.byDomain.find((d) => d.domain === domainId);
          const pct = domainStat?.pct ?? null;
          const attempts = domainStat?.attempts ?? 0;
          const isWeakest = stats.weakestDomain === domainId && attempts > 0;
          const isStrongest = stats.strongestDomain === domainId && attempts > 0 && stats.byDomain.length > 1;
          const label = pct !== null ? pctLabel(pct) : null;

          return (
            <div key={domainId} className="p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor[domain.color])} aria-hidden />
                  <span className="text-sm font-medium text-foreground truncate">{domain.shortName}</span>
                  {isWeakest && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-destructive shrink-0">
                      <TrendingDown className="w-3 h-3" aria-hidden />
                      Weakest
                    </span>
                  )}
                  {isStrongest && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-training-success shrink-0">
                      <TrendingUp className="w-3 h-3" aria-hidden />
                      Strongest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {pct !== null ? (
                    <>
                      <span className={cn("text-sm font-semibold", label!.color)}>{pct}%</span>
                      <span className="text-xs text-muted-foreground">{attempts} done</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Minus className="w-3 h-3" aria-hidden />
                      Not attempted
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                {pct !== null ? (
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", barColor[domain.color])}
                    style={{ width: `${pct}%` }}
                  />
                ) : (
                  <div className="h-full rounded-full bg-border w-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight callout if there's a clear weak area */}
      {stats.weakestDomain && stats.byDomain.length >= 2 && (() => {
        const weak = stats.byDomain.find((d) => d.domain === stats.weakestDomain)!;
        if (weak.pct >= 70) return null;
        const domain = GMC_DOMAINS[stats.weakestDomain];
        return (
          <div className="rounded-xl border border-border bg-secondary px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{domain.shortName}</span> is your weakest area at {weak.pct}%.
              Focus on {domain.keyPrinciples[0].toLowerCase()} to improve your score here.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
