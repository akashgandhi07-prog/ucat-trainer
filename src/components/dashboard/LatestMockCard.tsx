import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface MockScore {
  id: string;
  logged_date: string;
  score_vr: number | null;
  score_dm: number | null;
  score_qr: number | null;
  score_sjt: number | null;
  mock_type: string;
}

interface Plan {
  id: string;
  mock_target_total: number | null;
  mock_target_sjt_band: number | null;
}

interface LatestMockCardProps {
  userId: string;
}

function sjtBandColor(band: number | null): string {
  if (band == null) return "text-slate-400";
  if (band === 1) return "text-emerald-600";
  if (band === 2) return "text-blue-600";
  if (band === 3) return "text-amber-600";
  return "text-red-500";
}

function scoreDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

function DeltaBadge({ delta, invertColor = false }: { delta: number | null; invertColor?: boolean }) {
  if (delta == null || delta === 0) return null;
  const isGood = invertColor ? delta < 0 : delta > 0;
  return (
    <span className={`text-xs font-semibold ml-1 ${isGood ? "text-emerald-600" : "text-red-500"}`}>
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

/** Trend across last ≥3 mocks of same type: compare latest total vs average of prior two. */
function trendSignal(_latest: MockScore, sameType: MockScore[]): "up" | "down" | "flat" | null {
  // sameType is [latest, prev1, prev2, ...] desc
  if (sameType.length < 3) return null;
  const total = (s: MockScore) => {
    const parts = [s.score_vr, s.score_dm, s.score_qr].filter((n): n is number => n != null);
    return parts.length === 3 ? parts.reduce((a, b) => a + b, 0) : null;
  };
  const t0 = total(sameType[0]);
  const t1 = total(sameType[1]);
  const t2 = total(sameType[2]);
  if (t0 == null || t1 == null || t2 == null) return null;
  const priorAvg = (t1 + t2) / 2;
  const diff = t0 - priorAvg;
  if (diff > 20) return "up";
  if (diff < -20) return "down";
  return "flat";
}

function Skeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-slate-100 rounded" />
          <div className="h-3 w-36 bg-slate-100 rounded" />
        </div>
        <div className="h-3 w-16 bg-slate-100 rounded" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2,3].map(i => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 h-16" />
        ))}
      </div>
      <div className="mt-3 h-10 bg-slate-100 rounded-xl" />
    </div>
  );
}

export default function LatestMockCard({ userId }: LatestMockCardProps) {
  const [allScores, setAllScores] = useState<MockScore[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingTarget, setEditingTarget] = useState(false);
  const [totalInput, setTotalInput] = useState("");
  const [sjtInput, setSjtInput] = useState("");
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase
        .from("mock_scores")
        .select("id, logged_date, score_vr, score_dm, score_qr, score_sjt, mock_type")
        .eq("student_id", userId)
        .order("logged_date", { ascending: false })
        .limit(6),
      supabase
        .from("plans")
        .select("id, mock_target_total, mock_target_sjt_band")
        .eq("student_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([scoresRes, planRes]) => {
      if (cancelled) return;
      setAllScores((scoresRes.data as MockScore[]) ?? []);
      setPlan((planRes.data as Plan) ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  function openEdit() {
    setTotalInput(plan?.mock_target_total != null ? String(plan.mock_target_total) : "");
    setSjtInput(plan?.mock_target_sjt_band != null ? String(plan.mock_target_sjt_band) : "");
    setTargetError(null);
    setEditingTarget(true);
  }

  function cancelEdit() {
    setTargetError(null);
    setEditingTarget(false);
  }

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setTargetError(null);

    let mockTargetTotal: number | null = null;
    let mockTargetSjtBand: number | null = null;

    const trimTotal = totalInput.trim();
    if (trimTotal !== "") {
      const n = Number(trimTotal);
      if (!Number.isInteger(n) || n < 900 || n > 2700) {
        setTargetError("Must be 900-2700.");
        return;
      }
      mockTargetTotal = n;
    }
    const trimSjt = sjtInput.trim();
    if (trimSjt !== "") {
      const n = Number(trimSjt);
      if (!Number.isInteger(n) || n < 1 || n > 4) {
        setTargetError("Band must be 1-4.");
        return;
      }
      mockTargetSjtBand = n;
    }

    setTargetSaving(true);
    const { error } = await supabase
      .from("plans")
      .update({ mock_target_total: mockTargetTotal, mock_target_sjt_band: mockTargetSjtBand })
      .eq("id", plan.id)
      .eq("student_id", userId);
    setTargetSaving(false);

    if (error) { setTargetError("Could not save."); return; }
    setPlan(p => p ? { ...p, mock_target_total: mockTargetTotal, mock_target_sjt_band: mockTargetSjtBand } : p);
    setEditingTarget(false);
  }

  if (loading) return <Skeleton />;

  const targetTotal = plan?.mock_target_total ?? null;
  const targetSjt = plan?.mock_target_sjt_band ?? null;
  const hasTarget = targetTotal != null || targetSjt != null;

  // Target chip - shown in both empty and populated states
  const targetChip = plan && (
    editingTarget ? (
      <form onSubmit={saveTarget} className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-slate-500 whitespace-nowrap">Target:</label>
          <input
            type="number" min={900} max={2700} step={10} placeholder="e.g. 2100"
            value={totalInput}
            onChange={e => { setTotalInput(e.target.value); setTargetError(null); }}
            className="w-20 h-6 rounded border border-slate-200 bg-white px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[11px] text-slate-400">/ 2700</span>
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-slate-500">SJT:</label>
          <select
            value={sjtInput}
            onChange={e => { setSjtInput(e.target.value); setTargetError(null); }}
            className="h-6 rounded border border-slate-200 bg-white px-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Any</option>
            <option value="1">Band 1</option>
            <option value="2">Band 2</option>
            <option value="3">Band 3</option>
            <option value="4">Band 4</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button type="submit" disabled={targetSaving}
            className="h-6 rounded bg-blue-600 px-2 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {targetSaving ? "…" : "Save"}
          </button>
          <button type="button" onClick={cancelEdit}
            className="h-6 rounded border border-slate-200 px-2 text-[11px] text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
        </div>
        {targetError && <p className="w-full text-[11px] text-red-600">{targetError}</p>}
      </form>
    ) : (
      <button type="button" onClick={openEdit}
        className="group flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
        {hasTarget ? (
          <>
            <span className="font-medium text-slate-700">
              {targetTotal != null && `${targetTotal}/2700`}
              {targetTotal != null && targetSjt != null && " · "}
              {targetSjt != null && `SJT Band ${targetSjt}`}
            </span>
            <span className="text-slate-400">target</span>
          </>
        ) : (
          <span>+ Set target</span>
        )}
        <svg className="opacity-40 group-hover:opacity-80" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    )
  );

  if (allScores.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Mock Scores</h2>
          <Link to="/mock-scores" className="text-sm text-blue-600 font-medium hover:underline">
            Track scores →
          </Link>
        </div>
        {targetChip}
        <p className="text-sm text-slate-500">
          No mock scores logged yet.{" "}
          <Link to="/mock-scores" className="text-blue-600 hover:underline">
            Log your first mock
          </Link>{" "}
          to start tracking your progress.
        </p>
      </div>
    );
  }

  // Like-for-like comparison: latest overall, then most-recent of same type before it
  const latest = allScores[0];
  const sameType = allScores.filter(s => s.mock_type === latest.mock_type);
  const previous = sameType.length > 1 ? sameType[1] : null;

  const vrDelta = scoreDelta(latest.score_vr, previous?.score_vr ?? null);
  const dmDelta = scoreDelta(latest.score_dm, previous?.score_dm ?? null);
  const qrDelta = scoreDelta(latest.score_qr, previous?.score_qr ?? null);
  const sjtDelta = scoreDelta(latest.score_sjt, previous?.score_sjt ?? null);

  const mainScores = [latest.score_vr, latest.score_dm, latest.score_qr].filter((n): n is number => n != null);
  const total = mainScores.length > 0 ? mainScores.reduce((a, b) => a + b, 0) : null;
  const maxOut = mainScores.length * 900;

  const prevMainScores = previous
    ? [previous.score_vr, previous.score_dm, previous.score_qr].filter((n): n is number => n != null)
    : [];
  const prevTotal = prevMainScores.length > 0 ? prevMainScores.reduce((a, b) => a + b, 0) : null;
  const totalDelta = scoreDelta(total, prevTotal);

  const isFull = latest.mock_type === "full";
  const gapToTarget = isFull && total != null && targetTotal != null ? targetTotal - total : null;

  const trend = trendSignal(latest, sameType);
  const trendLabel = trend === "up" ? "↑ improving" : trend === "down" ? "↓ slipping" : trend === "flat" ? "→ plateauing" : null;
  const trendColor = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-amber-600";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-slate-900">Latest Mock</h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-xs text-slate-400">
                {latest.mock_type === "full" ? "Full mock" : "Mini mock"} · {timeAgo(latest.logged_date)}
                {previous ? ` · vs prev ${latest.mock_type}` : ""}
              </p>
              {trendLabel && (
                <span className={`text-[11px] font-semibold ${trendColor}`}>{trendLabel}</span>
              )}
            </div>
            {targetChip}
          </div>
          <Link to="/mock-scores" className="text-sm text-blue-600 font-medium hover:underline shrink-0 mt-0.5">
            All scores →
          </Link>
        </div>

        {/* Section tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["vr", "dm", "qr"] as const).map(key => {
            const scoreKey = `score_${key}` as keyof MockScore;
            const val = latest[scoreKey] as number | null;
            const delta = key === "vr" ? vrDelta : key === "dm" ? dmDelta : qrDelta;
            return (
              <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs font-medium text-slate-500 mb-1">{key.toUpperCase()}</p>
                <p className="text-xl font-bold text-slate-900">
                  {val ?? <span className="text-slate-300">-</span>}
                  <DeltaBadge delta={delta} />
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">/ 900</p>
              </div>
            );
          })}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs font-medium text-slate-500 mb-1">SJT</p>
            <p className={`text-xl font-bold ${sjtBandColor(latest.score_sjt)}`}>
              {latest.score_sjt != null ? `Band ${latest.score_sjt}` : <span className="text-slate-300">-</span>}
              {sjtDelta != null && sjtDelta !== 0 && (
                <span className={`text-xs font-semibold ml-1 ${sjtDelta < 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {sjtDelta < 0 ? "↑" : "↓"}
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">1 = best</p>
          </div>
        </div>

        {/* Total bar */}
        {total != null && (
          <div className="mt-3 flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-slate-300">
              {mainScores.length === 3 ? "Total (VR+DM+QR)" : `Total (${mainScores.length} section${mainScores.length !== 1 ? "s" : ""})`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {total}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {maxOut}</span>
                {totalDelta != null && totalDelta !== 0 && (
                  <span className={`text-sm font-semibold ml-2 ${totalDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalDelta > 0 ? "+" : ""}{totalDelta}
                  </span>
                )}
              </span>
              {gapToTarget != null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  gapToTarget <= 0
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}>
                  {gapToTarget <= 0
                    ? `✓ ${Math.abs(gapToTarget)} above target`
                    : `${gapToTarget} to target`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick log action */}
        <div className="mt-3 flex justify-end">
          <Link
            to="/mock-scores"
            className="text-xs text-slate-400 hover:text-blue-600 hover:underline transition-colors"
          >
            + Log another mock
          </Link>
        </div>
      </div>
    </div>
  );
}
