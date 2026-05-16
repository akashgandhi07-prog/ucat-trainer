import { useMemo } from "react";
import { Minus, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { GMC_DOMAINS } from "../../data/gmcDomains";
import { clearSJTData, getSJTStats } from "../../lib/sjtAnalytics";
import { cn } from "../../lib/cn";
import type { GMCDomainId } from "../../types/sjt";

const DOMAIN_IDS: GMCDomainId[] = [
  "knowledge_skills_development",
  "patients_partnership_communication",
  "colleagues_culture_safety",
  "trust_professionalism",
];

function pctLabel(pct: number): { text: string; className: string } {
  if (pct >= 80) return { text: "Strong", className: "text-training-success" };
  if (pct >= 60) return { text: "Developing", className: "text-warning" };
  return { text: "Needs work", className: "text-destructive" };
}

type Props = {
  refreshKey?: number;
  onClear?: () => void;
};

export default function SJTPerformancePanel({ refreshKey, onClear }: Props) {
  const stats = useMemo(() => getSJTStats(), [refreshKey]);

  if (!stats) return null;

  function handleClear() {
    if (window.confirm("Clear all SJT performance data?")) {
      clearSJTData();
      onClear?.();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Based on {stats.totalAttempts} scenario{stats.totalAttempts !== 1 ? "s" : ""}. Overall{" "}
          <span className="font-semibold text-foreground">{stats.pct}%</span>
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden />
          Reset data
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {DOMAIN_IDS.map((domainId) => {
          const domain = GMC_DOMAINS[domainId];
          const domainStat = stats.byDomain.find((item) => item.domain === domainId);
          const pct = domainStat?.pct ?? null;
          const attempts = domainStat?.attempts ?? 0;
          const isWeakest = stats.weakestDomain === domainId && attempts > 0;
          const isStrongest = stats.strongestDomain === domainId && attempts > 0 && stats.byDomain.length > 1;
          const label = pct !== null ? pctLabel(pct) : null;

          return (
            <div key={domainId} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden />
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
                  {label ? (
                    <p className={cn("text-xs font-medium", label.className)}>{label.text}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  {pct !== null ? (
                    <>
                      <p className="text-sm font-semibold text-foreground">{pct}%</p>
                      <p className="text-xs text-muted-foreground">{attempts} done</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Minus className="w-3 h-3" aria-hidden />
                      Not attempted
                    </p>
                  )}
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                {pct !== null ? (
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {stats.weakestDomain && stats.byDomain.length >= 2
        ? (() => {
            const weak = stats.byDomain.find((item) => item.domain === stats.weakestDomain);
            if (!weak || weak.pct >= 70) return null;
            const domain = GMC_DOMAINS[stats.weakestDomain];

            return (
              <div className="rounded-xl border border-border bg-secondary px-4 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{domain.shortName}</span> is your weakest area at{" "}
                  {weak.pct}%. Focus on {domain.keyPrinciples[0].toLowerCase()} to improve here.
                </p>
              </div>
            );
          })()
        : null}
    </div>
  );
}
