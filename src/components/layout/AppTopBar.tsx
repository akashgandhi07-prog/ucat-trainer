import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAppTopBarTitle } from "../../lib/appPageTitles";
import { APP_CONTENT_X } from "../../lib/appContentLayout";
import { useAuth } from "../../hooks/useAuth";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { useBugReportModal } from "../../contexts/BugReportContext";

export default function AppTopBar({ className = "" }: { className?: string }) {
  const [signingOut, setSigningOut] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pageTitle = getAppTopBarTitle(pathname);
  const { user, profile, isAdmin, loading, sessionLoadFailed, retryGetSession, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openBugReport } = useBugReportModal();

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    user?.email?.trim() ||
    null;

  const showSessionRecovery = !loading && !user && sessionLoadFailed;

  return (
    <header
      className={`h-14 shrink-0 border-b border-border bg-background flex items-center justify-between gap-3 ${APP_CONTENT_X} z-10 ${className}`}
    >
      {showSessionRecovery ? (
        <div className="flex items-center gap-2 text-xs text-amber-900">
          <span>Connection issue.</span>
          <button type="button" onClick={retryGetSession} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : (
        <p className="text-sm font-semibold text-foreground truncate">
          {pageTitle}
        </p>
      )}
      <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
        <button
          type="button"
          onClick={openBugReport}
          className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1"
        >
          Feedback
        </button>
        {isAdmin ? (
          <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1">
            Admin
          </Link>
        ) : null}
        {user ? (
          <>
            <span className="text-sm text-muted-foreground hidden md:inline">
              Hi, {displayName ?? "there"}
            </span>
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
                navigate("/");
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openAuthModal("register")}
              className="text-sm font-medium text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </header>
  );
}
