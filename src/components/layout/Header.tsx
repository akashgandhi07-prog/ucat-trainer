import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { useBugReportModal } from "../../contexts/BugReportContext";

export default function Header() {
  const { user, profile, isAdmin, loading, sessionLoadFailed, retryGetSession } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openBugReport } = useBugReportModal();
  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    null;

  const showSessionRecovery = !loading && !user && sessionLoadFailed;

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      {showSessionRecovery && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 flex-wrap text-sm text-amber-900">
          <span>Having trouble connecting?</span>
          <button
            type="button"
            onClick={retryGetSession}
            className="font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded px-1"
          >
            Retry
          </button>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link
          to="/"
          className="text-xl sm:text-2xl font-bold text-slate-900 shrink-0 hover:text-blue-600 transition-colors min-h-[44px] flex items-center"
        >
          The UKCAT People
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Link
            to="/"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={openBugReport}
            className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
          >
            Feedback
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
            >
              Admin
            </Link>
          )}
          {user ? (
            displayName ? (
              <span className="text-sm text-slate-600 min-h-[44px] inline-flex items-center" aria-label={`Signed in as ${displayName}`}>
                Hi, {displayName}
              </span>
            ) : null
          ) : (
            <>
              <button
                type="button"
                onClick={openAuthModal}
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 inline-flex items-center justify-center"
                aria-label="Register"
              >
                Register
              </button>
              <button
                type="button"
                onClick={openAuthModal}
                className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0 inline-flex items-center justify-center"
                aria-label="Login"
              >
                Login
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
