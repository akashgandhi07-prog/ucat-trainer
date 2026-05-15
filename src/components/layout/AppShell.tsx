import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Calculator, CalendarDays, GraduationCap, LineChart, LayoutDashboard, Home, Scale } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { AppShellProvider } from "../../contexts/AppShellContext";
import AppTopBar from "./AppTopBar";
import { cn } from "../../lib/cn";
import { isPlannerIntegrated } from "../../lib/plannerUrl";

const NO_SHELL = ["/reset-password"];

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
    isActive
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );
}

export default function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTutorNav, setShowTutorNav] = useState(false);
  const chromeRef = useRef<HTMLDivElement>(null);
  const plannerOn = isPlannerIntegrated();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("planner_role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setShowTutorNav(data?.planner_role === "tutor");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tutorNavVisible = Boolean(user && showTutorNav);

  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    const setHeight = () => {
      document.documentElement.style.setProperty("--app-chrome-height", `${el.offsetHeight}px`);
    };

    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (NO_SHELL.includes(location.pathname)) {
    return <Outlet />;
  }

  const sidebar = (
    <aside className="flex flex-col h-full min-h-0 border-r border-border bg-background">
      <div className="px-4 py-4 border-b border-border shrink-0">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-foreground hover:text-primary">
          <span className="text-base tracking-tight">TheUKCATPeople</span>
          <span className="text-[10px] font-semibold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            Free
          </span>
        </NavLink>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-1" aria-label="Main">
        <NavLink to="/" end className={navClass} onClick={() => setMobileOpen(false)}>
          <Home className="w-4 h-4 shrink-0" aria-hidden />
          Home
        </NavLink>
        <NavLink to="/dashboard" className={navClass} onClick={() => setMobileOpen(false)}>
          <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden />
          My progress
        </NavLink>

        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Skills trainers
        </p>
        <NavLink to="/ucat-verbal-reasoning-practice" className={navClass} onClick={() => setMobileOpen(false)}>
          <BookOpen className="w-4 h-4 shrink-0" aria-hidden />
          Verbal Reasoning
        </NavLink>
        <NavLink to="/ucat-decision-making-practice" className={navClass} onClick={() => setMobileOpen(false)}>
          <Scale className="w-4 h-4 shrink-0" aria-hidden />
          Decision Making
        </NavLink>
        <NavLink to="/ucat-quantitative-reasoning-practice" className={navClass} onClick={() => setMobileOpen(false)}>
          <Calculator className="w-4 h-4 shrink-0" aria-hidden />
          Quantitative Reasoning
        </NavLink>

        {plannerOn ? (
          <>
            <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Planning
            </p>
            <NavLink to="/study-plan" className={navClass} onClick={() => setMobileOpen(false)}>
              <CalendarDays className="w-4 h-4 shrink-0" aria-hidden />
              Study plan
            </NavLink>
            <NavLink to="/mock-scores" className={navClass} onClick={() => setMobileOpen(false)}>
              <LineChart className="w-4 h-4 shrink-0" aria-hidden />
              Mock scores
            </NavLink>
            {tutorNavVisible ? (
              <NavLink to="/tutor" className={navClass} onClick={() => setMobileOpen(false)}>
                <GraduationCap className="w-4 h-4 shrink-0" aria-hidden />
                Tutor dashboard
              </NavLink>
            ) : null}
          </>
        ) : null}
      </nav>
    </aside>
  );

  return (
    <AppShellProvider>
      <div className="flex flex-col h-dvh min-h-0 overflow-hidden bg-background">
        {/* Mobile: full-width chrome */}
        <div className="lg:hidden shrink-0 border-b border-border bg-background">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              className="px-2 py-1 text-sm font-medium rounded-lg border border-border"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="app-sidebar"
            >
              Menu
            </button>
            <span className="font-semibold text-sm">TheUKCATPeople</span>
          </div>
          <AppTopBar className="border-b-0 shadow-none" />
        </div>

        <div className="flex flex-1 min-h-0 bg-background">
          {/* Sidebar */}
          <div
            id="app-sidebar"
            className={cn(
              "shrink-0 bg-background",
              "lg:flex lg:w-[min(280px,20vw)] lg:min-w-[220px] lg:max-w-[280px]",
              mobileOpen
                ? "fixed inset-y-0 left-0 z-40 flex w-[min(280px,85vw)] shadow-xl"
                : "hidden",
            )}
          >
            {sidebar}
          </div>
          {mobileOpen ? (
            <button
              type="button"
              className="lg:hidden fixed inset-0 z-[35] bg-black/30"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
          ) : null}

          {/* Main column: top bar (desktop) + scrollable content */}
          <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-background">
            <div
              ref={chromeRef}
              className="hidden lg:block shrink-0 border-b border-border bg-background"
            >
              <AppTopBar className="border-b-0 shadow-none" />
            </div>
            <main className="flex-1 min-h-0 min-w-0 overflow-y-auto bg-background">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </AppShellProvider>
  );
}
