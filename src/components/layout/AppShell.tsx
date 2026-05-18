import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LogIn, Menu, MessageSquare, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import { AppShellProvider } from "../../contexts/AppShellContext";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { useBugReportModal } from "../../contexts/BugReportContext";
import AppTopBar from "./AppTopBar";
import AppSidebar, {
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
} from "./AppSidebar";
import { cn } from "../../lib/cn";
import { isPlannerIntegrated } from "../../lib/plannerUrl";
import { getAppTopBarTitle } from "../../lib/appPageTitles";

const NO_SHELL = ["/reset-password"];

export default function AppShell() {
  const location = useLocation();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openBugReport } = useBugReportModal();
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
        <div className="lg:hidden shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex min-h-[60px] items-center gap-3 px-3 py-2">
            <button
              type="button"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-sm",
                "transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="app-sidebar-mobile"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                TheUKCATPeople
              </p>
              <p className="truncate text-base font-semibold leading-tight text-foreground">
                {getAppTopBarTitle(location.pathname)}
              </p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={openBugReport}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Send feedback"
                title="Feedback"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
              </button>
              {!user ? (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <LogIn className="h-4 w-4" aria-hidden />
                  <span>Sign in</span>
                </button>
              ) : null}
            </div>
          </div>
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
              id="app-main-scroll"
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
