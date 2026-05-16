import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isMocksOnlyPlaceholderPlan } from "../../planner/lib/load-planner-data";
import { supabase } from "../../lib/supabase";

interface PlanSession {
  id: string;
  session_type: string;
  duration_minutes: number;
  position: number;
}

interface TodayPlanStripProps {
  userId: string;
}

const SESSION_LABELS: Record<string, string> = {
  vr_practice: "Verbal Reasoning",
  dm_practice: "Decision Making",
  qr_practice: "Quantitative Reasoning",
  sjt_practice: "SJT",
  mini_mock: "Mini Mock",
  full_mock: "Full Mock",
  reflection: "Reflection",
  rest: "Rest",
};

const SESSION_COLORS: Record<string, string> = {
  vr_practice: "bg-blue-100 text-blue-800 border-blue-200",
  dm_practice: "bg-violet-100 text-violet-800 border-violet-200",
  qr_practice: "bg-amber-100 text-amber-800 border-amber-200",
  sjt_practice: "bg-teal-100 text-teal-800 border-teal-200",
  mini_mock: "bg-orange-100 text-orange-800 border-orange-200",
  full_mock: "bg-red-100 text-red-800 border-red-200",
  reflection: "bg-slate-100 text-slate-700 border-slate-200",
  rest: "bg-slate-50 text-slate-500 border-slate-200",
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodayPlanStrip({ userId }: TodayPlanStripProps) {
  const [sessions, setSessions] = useState<PlanSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: plan } = await supabase
        .from("plans")
        .select("id, exam_date")
        .eq("student_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (!plan || isMocksOnlyPlaceholderPlan(plan)) {
        setLoading(false);
        return;
      }

      setHasPlan(true);

      const { data: rows } = await supabase
        .from("plan_sessions")
        .select("id, session_type, duration_minutes, position")
        .eq("plan_id", plan.id)
        .eq("day_date", todayISO())
        .order("position");

      if (cancelled) return;
      setSessions((rows as PlanSession[]) ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || !hasPlan) return null;

  const visibleSessions = sessions.filter((s) => s.session_type !== "rest");

  if (visibleSessions.length === 0) {
    return (
      <TodayPlanRestDay />
    );
  }

  const totalMinutes = visibleSessions.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">Today&apos;s plan</p>
          <span className="text-xs text-slate-400">· {totalMinutes} min</span>
        </div>
        <Link
          to="/study-plan/today"
          className="text-sm text-blue-600 font-medium hover:underline shrink-0"
        >
          Open plan →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleSessions.map((s) => {
          const label = SESSION_LABELS[s.session_type] ?? s.session_type;
          const colorClass =
            SESSION_COLORS[s.session_type] ?? "bg-slate-100 text-slate-700 border-slate-200";
          return (
            <span
              key={s.id}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${colorClass}`}
            >
              {label}
              {s.duration_minutes > 0 && (
                <span className="opacity-70">{s.duration_minutes}m</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TodayPlanRestDay() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Today&apos;s plan</p>
        <p className="text-xs text-slate-500">Rest day or no sessions scheduled.</p>
      </div>
      <Link
        to="/study-plan/today"
        className="text-sm text-blue-600 font-medium hover:underline shrink-0"
      >
        View plan →
      </Link>
    </div>
  );
}
