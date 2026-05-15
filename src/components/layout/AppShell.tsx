import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { AppShellProvider } from "../../contexts/AppShellContext";
import AppTopBar from "./AppTopBar";
import AppSidebar, {
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
} from "./AppSidebar";
import { cn } from "../../lib/cn";
import { isPlannerIntegrated } from "../../lib/plannerUrl";

const NO_SHELL = ["/reset-password"];

export default function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsedPreference());
  const [showTutorNav, setShowTutorNav] = useState(false);
  const chromeRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const plannerOn = isPlannerIntegrated();

  useLayoutEffect(() => {
    mainScrollRef.current?.scrollTo(0, 0);
  }, [location.key]);

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

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsedPreference(next);
      return next;
    });
  };

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

  const sidebarProps = {
    plannerOn,
    tutorNavVisible,
    onNavigate: () => setMobileOpen(false),
  };

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
              aria-controls="app-sidebar-mobile"
            >
              Menu
            </button>
            <span className="font-semibold text-sm">TheUKCATPeople</span>
          </div>
          <AppTopBar className="border-b-0 shadow-none" />
        </div>

        <div className="flex flex-1 min-h-0 bg-background">
          {/* Desktop sidebar */}
          <div id="app-sidebar" className="hidden lg:flex shrink-0 overflow-hidden">
            <AppSidebar
              {...sidebarProps}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={toggleSidebarCollapsed}
            />
          </div>

          {/* Mobile drawer */}
          <div
            id="app-sidebar-mobile"
            className={cn(
              "lg:hidden fixed inset-y-0 left-0 z-40 flex shadow-xl transition-transform duration-200",
              mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
            )}
            aria-hidden={!mobileOpen}
          >
            <AppSidebar {...sidebarProps} collapsed={false} onToggleCollapsed={() => {}} forceExpanded />
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
            <main
              ref={mainScrollRef}
              className="flex-1 min-h-0 min-w-0 overflow-y-auto bg-background"
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </AppShellProvider>
  );
}
