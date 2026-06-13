import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, RotateCcw } from "lucide-react";
import { getSJTStats, clearSJTData } from "../../lib/sjtAnalytics";
import type { SJTOverallStats, SJTDomainStats } from "../../lib/sjtAnalytics";
import { GMC_DOMAINS } from "../../data/gmcDomains";
import type { GMCDomainId } from "../../types/sjt";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/cn";

const dotColor: Record<string, string> = {
  blue:    "bg-primary",
  emerald: "bg-primary",
  amber:   "bg-muted-foreground",
  purple:  "bg-muted-foreground",
};

const barColor: Record<string, string> = {
  blue:    "bg-primary",
  emerald: "bg-primary",
  amber:   "bg-muted-foreground",
  purple:  "bg-muted-foreground",
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

/** Minimal slice of an sjt_sessions row needed for domain stats. */
type SJTCloudRow = {
  domain: GMCDomainId;
  score: number;
  max_score: number;
};

/** Compute the same overall/domain stats shape as sjtAnalytics, from cloud sjt_sessions rows. */
function computeStatsFromCloudRows(rows: SJTCloudRow[]): SJTOverallStats | null {
  if (rows.length === 0) return null;

  const byDomain = new Map<GMCDomainId, { score: number; max: number; count: number }>();
  for (const r of rows) {
    const d = byDomain.get(r.domain) ?? { score: 0, max: 0, count: 0 };
    byDomain.set(r.domain, {
      score: d.score + r.score,
      max: d.max + r.max_score,
      count: d.count + 1,
    });
  }

  const domainStats: SJTDomainStats[] = Array.from(byDomain.entries()).map(
    ([domain, { score, max, count }]) => ({
      domain,
      attempts: count,
      totalScore: score,
      totalMax: max,
      pct: max > 0 ? Math.round((score / max) * 100) : 0,
    }),
  );

  const sorted = [...domainStats].sort((a, b) => a.pct - b.pct);
  const totalScore = rows.reduce((s, r) => s + r.score, 0);
  const totalMax = rows.reduce((s, r) => s + r.max_score, 0);

  return {
    totalAttempts: rows.length,
    totalScore,
    totalMax,
    pct: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    byDomain: sorted,
    weakestDomain: sorted.length > 0 ? sorted[0].domain : null,
    strongestDomain: sorted.length > 0 ? sorted[sorted.length - 1].domain : null,
  };
}

export default function SJTPerformancePanel({ refreshKey: _refreshKey, onClear }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const [cloudStats, setCloudStats] = useState<SJTOverallStats | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- _refreshKey is a cache-bust trigger, not used inside
  const localStats = useMemo(() => getSJTStats(), [_refreshKey]);

  // Signed in: fetch completed sjt_sessions and compute domain stats from the cloud.
  // On error (or while loading) we fall back to localStorage stats below.
  useEffect(() => {
    if (!userId) {
      setCloudStats(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("sjt_sessions")
      .select("domain, score, max_score")
      .eq("user_id", userId)
      .eq("completed", true)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setCloudStats(null);
          return;
        }
        setCloudStats(computeStatsFromCloudRows((data as SJTCloudRow[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, _refreshKey]);

  // Cloud stats take precedence when signed in (they include all devices); guests
  // and any cloud failure fall back to localStorage stats unchanged.
  const stats = cloudStats ?? localStats;
  const showingCloudStats = cloudStats != null;

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
        {/* Reset only clears device-local data, so hide it when showing cloud stats */}
        {!showingCloudStats && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
            Reset data
          </button>
        )}
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
