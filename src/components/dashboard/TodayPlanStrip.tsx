import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isMocksOnlyPlaceholderPlan } from "../../planner/lib/load-planner-data";
import { supabase } from "../../lib/supabase";
import { withTimeout } from "../../lib/withTimeout";

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
  vr_practice:  "bg-secondary text-foreground border-border",
  dm_practice:  "bg-secondary text-foreground border-border",
  qr_practice:  "bg-secondary text-foreground border-border",
  sjt_practice: "bg-secondary text-foreground border-border",
  mini_mock:    "bg-secondary text-foreground border-border",
  full_mock:    "bg-foreground text-card border-foreground",
  reflection:   "bg-secondary text-foreground border-border",
  rest:         "bg-secondary text-muted-foreground border-border",
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
      try {
        const { data: plan } = await withTimeout(
          supabase
            .from("plans")
            .select("id, exam_date")
            .eq("student_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        );

        if (cancelled) return;
        if (!plan || isMocksOnlyPlaceholderPlan(plan)) {
          setLoading(false);
          return;
        }

        setHasPlan(true);

        const { data: rows } = await withTimeout(
          supabase
            .from("plan_sessions")
            .select("id, session_type, duration_minutes, position")
            .eq("plan_id", plan.id)
            .eq("day_date", todayISO())
            .order("position"),
        );

        if (cancelled) return;
        setSessions((rows as PlanSession[]) ?? []);
        setLoading(false);
      } catch {
        // Hang or error: stop loading (the strip hides itself when no plan loaded).
        if (!cancelled) setLoading(false);
      }
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
    <div className="bg-card rounded-xl border border-border px-5 py-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Today&apos;s plan</p>
          <span className="text-xs text-muted-foreground">· {totalMinutes} min</span>
        </div>
        <Link
          to="/study-plan/today"
          className="text-sm text-primary font-medium hover:underline shrink-0"
        >
          Open plan →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleSessions.map((s) => {
          const label = SESSION_LABELS[s.session_type] ?? s.session_type;
          const colorClass =
            SESSION_COLORS[s.session_type] ?? "bg-secondary text-foreground border-border";
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
    <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Today&apos;s plan</p>
        <p className="text-xs text-muted-foreground">Rest day or no sessions scheduled.</p>
      </div>
      <Link
        to="/study-plan/today"
        className="text-sm text-primary font-medium hover:underline shrink-0"
      >
        View plan →
      </Link>
    </div>
  );
}
