import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  GraduationCap,
  Home,
  LayoutDashboard,
  Library,
  LineChart,
  Scale,
  Users,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { getStreakAndLastPracticed } from "../../lib/streakUtils";
import { cn } from "../../lib/cn";
import { ProductUpsellSidebar } from "./ProductUpsell";

const SIDEBAR_COLLAPSED_KEY = "ucat-sidebar-collapsed";
/** Brief pause before hover-expand so the sidebar does not snap open. */
const HOVER_EXPAND_DELAY_MS = 140;
/** Short delay before hover-collapse to avoid flicker at the edge. */
const HOVER_COLLAPSE_DELAY_MS = 120;

// eslint-disable-next-line react-refresh/only-export-components
export function readSidebarCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function writeSidebarCollapsedPreference(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

type AppSidebarProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  plannerOn: boolean;
  tutorNavVisible: boolean;
  onNavigate?: () => void;
  /** Mobile drawer: always show labels and full width */
  forceExpanded?: boolean;
};

function navClass({ isActive }: { isActive: boolean }, iconOnly: boolean) {
  return cn(
    "group flex items-center rounded-xl text-sm font-medium transition-colors w-full",
    iconOnly ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2",
    isActive
      ? "bg-white/15 text-white shadow-sm"
      : "text-sky-200/80 hover:bg-white/10 hover:text-white",
  );
}

function NavIcon({ children, active }: { children: ReactNode; active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        active ? "bg-sky-400/90 text-white" : "bg-white/10 text-sky-100 group-hover:bg-white/15",
      )}
    >
      {children}
    </span>
  );
}

function SectionDivider() {
  return <div className="my-2 border-t border-white/10" role="presentation" />;
}

function StreakText({ streak }: { streak: number }) {
  return (
    <div className="min-w-0">
      <p className="text-lg font-bold leading-tight">
        {streak}{" "}
        <span className="text-sm font-medium text-sky-200/90">day{streak === 1 ? "" : "s"}</span>
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">Active streak</p>
    </div>
  );
}

function StreakCard({ streak, iconOnly }: { streak: number; iconOnly: boolean }) {
  if (iconOnly) {
    return (
      <div className="mx-2 mb-2 flex flex-col items-center gap-1 rounded-2xl bg-white/10 px-2 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <Flame className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-bold leading-none">{streak}</span>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
        <Flame className="h-5 w-5" aria-hidden />
      </span>
      <StreakText streak={streak} />
    </div>
  );
}

export default function AppSidebar({
  collapsed,
  onToggleCollapsed,
  plannerOn,
  tutorNavVisible,
  onNavigate,
  forceExpanded = false,
}: AppSidebarProps) {
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const iconOnly = !forceExpanded && collapsed && !hoverExpanded;
  const { user, profile } = useAuth();
  const [streak, setStreak] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const clearHoverExpandTimer = () => {
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
  };

  const clearHoverCollapseTimer = () => {
    if (hoverCollapseTimerRef.current) {
      clearTimeout(hoverCollapseTimerRef.current);
      hoverCollapseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearHoverExpandTimer();
      clearHoverCollapseTimer();
    };
  }, []);

  const handleSidebarMouseEnter = () => {
    if (!collapsed || forceExpanded) return;
    clearHoverCollapseTimer();
    clearHoverExpandTimer();
    hoverExpandTimerRef.current = setTimeout(() => {
      setHoverExpanded(true);
      hoverExpandTimerRef.current = null;
    }, HOVER_EXPAND_DELAY_MS);
  };

  const handleSidebarMouseLeave = () => {
    clearHoverExpandTimer();
    clearHoverCollapseTimer();
    hoverCollapseTimerRef.current = setTimeout(() => {
      setHoverExpanded(false);
      hoverCollapseTimerRef.current = null;
    }, HOVER_COLLAPSE_DELAY_MS);
  };

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const check = () => setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      const resetTimer = window.setTimeout(() => setStreak(0), 0);
      return () => window.clearTimeout(resetTimer);
    }
    void supabase
      .from("sessions")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []) as { created_at: string }[];
        setStreak(getStreakAndLastPracticed(rows).streak);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const showStreak = Boolean(user && streak > 0);

  return (
    <aside
      className={cn(
        "relative flex h-full min-h-0 flex-col border-r-2 border-sky-400/50",
        "bg-gradient-to-b from-[hsl(215_48%_14%)] to-[hsl(215_52%_11%)] text-white",
        "transition-[width] duration-300 ease-in-out",
        forceExpanded
          ? "w-[min(280px,85vw)]"
          : collapsed && !hoverExpanded
            ? "w-[4.75rem]"
            : "w-[17.5rem]",
      )}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      <div
        className={cn(
          "relative shrink-0 border-b border-white/10",
          iconOnly ? "px-2 py-3" : "px-4 py-4",
        )}
      >
        <NavLink
          to="/"
          className={cn(
            "flex min-w-0 items-center font-bold text-white hover:text-sky-100 transition-colors",
            iconOnly ? "justify-center" : "gap-2 pr-10",
          )}
          onClick={onNavigate}
          title="TheUKCATPeople"
        >
          {iconOnly ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm font-bold tracking-tight">
              UK
            </span>
          ) : (
            <>
              <span className="text-base tracking-tight truncate">TheUKCATPeople</span>
              <span className="shrink-0 text-[10px] font-semibold uppercase text-sky-300 bg-sky-400/20 px-1.5 py-0.5 rounded">
                Free
              </span>
            </>
          )}
        </NavLink>

        {!forceExpanded ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "bg-sky-400/25 text-white hover:bg-sky-400/40 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(215_48%_14%)]",
              iconOnly ? "mx-auto mt-2" : "absolute right-3 top-4",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {showStreak ? <StreakCard streak={streak} iconOnly={iconOnly} /> : null}

      <div className="relative flex-1 min-h-0">
      <nav
        ref={navRef}
        className={cn(
          "h-full overflow-y-auto space-y-0.5",
          iconOnly ? "px-2 py-3" : "px-3 py-3",
        )}
        aria-label="Main"
      >
        <NavLink to="/" end className={(p) => navClass(p, iconOnly)} title="Home" onClick={onNavigate}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <Home className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Home</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/dashboard"
          className={(p) => navClass(p, iconOnly)}
          title="My progress"
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <LayoutDashboard className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>My progress</span>
            </>
          )}
        </NavLink>

        {!iconOnly ? (
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">
            Skills trainers
          </p>
        ) : (
          <SectionDivider />
        )}
        <NavLink
          to="/ucat-verbal-reasoning-practice"
          className={(p) => navClass(p, iconOnly)}
          title="Verbal Reasoning"
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <BookOpen className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Verbal Reasoning</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/ucat-decision-making-practice"
          className={(p) => navClass(p, iconOnly)}
          title="Decision Making"
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <Scale className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Decision Making</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/ucat-quantitative-reasoning-practice"
          className={(p) => navClass(p, iconOnly)}
          title="Quantitative Reasoning"
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <Calculator className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Quantitative Reasoning</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/ucat-sjt-practice"
          className={(p) => navClass(p, iconOnly)}
          title="Situational Judgement"
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <Users className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Situational Judgement</span>
            </>
          )}
        </NavLink>

        {plannerOn ? (
          <>
            {!iconOnly ? (
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">
                Planning
              </p>
            ) : (
              <SectionDivider />
            )}
            <NavLink
              to="/study-plan"
              className={(p) => navClass(p, iconOnly)}
              title="Study plan"
              onClick={onNavigate}
            >
              {({ isActive }) => (
                <>
                  <NavIcon active={isActive}>
                    <CalendarDays className="h-4 w-4" aria-hidden />
                  </NavIcon>
                  <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Study plan</span>
                </>
              )}
            </NavLink>
            <NavLink
              to="/mock-scores"
              className={(p) => navClass(p, iconOnly)}
              title="Mock scores"
              onClick={onNavigate}
            >
              {({ isActive }) => (
                <>
                  <NavIcon active={isActive}>
                    <LineChart className="h-4 w-4" aria-hidden />
                  </NavIcon>
                  <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Mock scores</span>
                </>
              )}
            </NavLink>
            {tutorNavVisible ? (
              <NavLink
                to="/tutor"
                className={(p) => navClass(p, iconOnly)}
                title="Tutor dashboard"
                onClick={onNavigate}
              >
                {({ isActive }) => (
                  <>
                    <NavIcon active={isActive}>
                      <GraduationCap className="h-4 w-4" aria-hidden />
                    </NavIcon>
                    <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Tutor dashboard</span>
                  </>
                )}
              </NavLink>
            ) : null}
          </>
        ) : null}

        {!iconOnly ? (
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300/70">
            Resources
          </p>
        ) : (
          <SectionDivider />
        )}
        <NavLink
          to="/study-guides"
          className={(p) => navClass(p, iconOnly)}
          title="Study guides"
          onClick={onNavigate}
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <Library className="h-4 w-4" aria-hidden />
              </NavIcon>
              <span className={cn("overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out", iconOnly ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>Study guides</span>
            </>
          )}
        </NavLink>
      </nav>
      {canScrollDown && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 flex items-end justify-center pb-1.5"
          style={{ background: "linear-gradient(to bottom, transparent, hsl(215 52% 11% / 0.95))" }}
        >
          <ChevronDown className="h-4 w-4 text-sky-300/70 animate-bounce" aria-hidden />
        </div>
      )}
      </div>
      <ProductUpsellSidebar stream={profile?.stream ?? null} iconOnly={iconOnly} />
    </aside>
  );
}
