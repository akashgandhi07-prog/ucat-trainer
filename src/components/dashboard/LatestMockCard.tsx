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

interface LatestMockCardProps {
  userId: string;
}

function sjtBandLabel(band: number | null): string {
  if (band == null) return "-";
  return `Band ${band}`;
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
    <span
      className={`text-xs font-semibold ml-1 ${isGood ? "text-emerald-600" : "text-red-500"}`}
    >
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LatestMockCard({ userId }: LatestMockCardProps) {
  const [latest, setLatest] = useState<MockScore | null>(null);
  const [previous, setPrevious] = useState<MockScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("mock_scores")
      .select("id, logged_date, score_vr, score_dm, score_qr, score_sjt, mock_type")
      .eq("student_id", userId)
      .order("logged_date", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data as MockScore[]) ?? [];
        setLatest(rows[0] ?? null);
        setPrevious(rows[1] ?? null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return null;
  if (!latest) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">Mock Scores</h2>
          <Link to="/mock-scores" className="text-sm text-blue-600 font-medium hover:underline">
            Track scores →
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          No mock scores logged yet.{" "}
          <Link to="/mock-scores" className="text-blue-600 hover:underline">
            Log your first mock
          </Link>{" "}
          to track your exam performance here.
        </p>
      </div>
    );
  }

  const vrDelta = scoreDelta(latest.score_vr, previous?.score_vr ?? null);
  const dmDelta = scoreDelta(latest.score_dm, previous?.score_dm ?? null);
  const qrDelta = scoreDelta(latest.score_qr, previous?.score_qr ?? null);
  const sjtDelta = scoreDelta(latest.score_sjt, previous?.score_sjt ?? null);

  const total =
    (latest.score_vr ?? 0) + (latest.score_dm ?? 0) + (latest.score_qr ?? 0) > 0
      ? (latest.score_vr ?? 0) + (latest.score_dm ?? 0) + (latest.score_qr ?? 0)
      : null;

  const prevTotal =
    previous &&
    (previous.score_vr ?? 0) + (previous.score_dm ?? 0) + (previous.score_qr ?? 0) > 0
      ? (previous.score_vr ?? 0) + (previous.score_dm ?? 0) + (previous.score_qr ?? 0)
      : null;

  const totalDelta = scoreDelta(total, prevTotal);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Latest Mock</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {latest.mock_type === "full" ? "Full mock" : "Mini mock"} · {formatDate(latest.logged_date)}
              {previous ? " · vs previous" : ""}
            </p>
          </div>
          <Link to="/mock-scores" className="text-sm text-blue-600 font-medium hover:underline shrink-0">
            All scores →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* VR */}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs font-medium text-slate-500 mb-1">VR</p>
            <p className="text-xl font-bold text-slate-900">
              {latest.score_vr ?? "-"}
              <DeltaBadge delta={vrDelta} />
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">/ 900</p>
          </div>

          {/* DM */}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs font-medium text-slate-500 mb-1">DM</p>
            <p className="text-xl font-bold text-slate-900">
              {latest.score_dm ?? "-"}
              <DeltaBadge delta={dmDelta} />
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">/ 900</p>
          </div>

          {/* QR */}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs font-medium text-slate-500 mb-1">QR</p>
            <p className="text-xl font-bold text-slate-900">
              {latest.score_qr ?? "-"}
              <DeltaBadge delta={qrDelta} />
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">/ 900</p>
          </div>

          {/* SJT */}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs font-medium text-slate-500 mb-1">SJT</p>
            <p className={`text-xl font-bold ${sjtBandColor(latest.score_sjt)}`}>
              {sjtBandLabel(latest.score_sjt)}
              {sjtDelta != null && sjtDelta !== 0 && (
                <span className={`text-xs font-semibold ml-1 ${sjtDelta < 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {sjtDelta < 0 ? "↑" : "↓"}
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">1 = best</p>
          </div>
        </div>

        {/* Total */}
        {total != null && (
          <div className="mt-3 flex items-center justify-between bg-slate-900 text-white rounded-xl px-4 py-2.5">
            <span className="text-sm font-medium text-slate-300">Total (VR+DM+QR)</span>
            <span className="text-lg font-bold">
              {total}
              {totalDelta != null && totalDelta !== 0 && (
                <span className={`text-sm font-semibold ml-2 ${totalDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {totalDelta > 0 ? "+" : ""}{totalDelta}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
