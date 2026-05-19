import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { useBugReportModal } from "../../contexts/BugReportContext";
import { MainSiteNavBar } from "./MainSiteNav";

export default function AppTopBar({ className = "" }: { className?: string }) {
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading, sessionLoadFailed, retryGetSession, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openBugReport } = useBugReportModal();

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    null;

  const showSessionRecovery = !loading && !user && sessionLoadFailed;

  return (
    <header
      className={`h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-3 px-4 z-30 ${className}`}
    >
      {showSessionRecovery ? (
        <div className="flex items-center gap-2 text-xs text-amber-900 mr-auto">
          <span>Connection issue.</span>
          <button type="button" onClick={retryGetSession} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : (
        /* Mega-menu — takes available horizontal space */
        <div className="flex-1 min-w-0 overflow-hidden">
          <MainSiteNavBar />
        </div>
      )}

      {/* Right-hand controls */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <button
          type="button"
          onClick={openBugReport}
          className="text-[13px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          Feedback
        </button>

        {isAdmin && (
          <a
            href="/admin"
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            Admin
          </a>
        )}

        {user ? (
          <>
            {displayName && (
              <span className="hidden md:block text-xs font-medium text-muted-foreground max-w-[110px] truncate px-1">
                {displayName}
              </span>
            )}
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
                navigate("/");
              }}
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openAuthModal("register")}
              className="text-[13px] font-semibold text-foreground px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="text-[13px] font-semibold bg-primary text-primary-foreground px-3.5 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </header>
  );
}
