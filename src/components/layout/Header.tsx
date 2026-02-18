import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { useBugReportModal } from "../../contexts/BugReportContext";

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
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

  const navLinks = (
    <>
      <Link
        to="/"
        onClick={() => setMobileMenuOpen(false)}
        className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
      >
        Home
      </Link>
      <Link
        to="/dashboard"
        onClick={() => setMobileMenuOpen(false)}
        className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
      >
        Dashboard
      </Link>
      <button
        type="button"
        onClick={() => {
          openBugReport();
          setMobileMenuOpen(false);
        }}
        className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
      >
        Feedback
      </button>
      {isAdmin && (
        <Link
          to="/admin"
          onClick={() => setMobileMenuOpen(false)}
          className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center py-2 px-2"
        >
          Admin
        </Link>
      )}
      {user ? (
        <div className="flex items-center gap-2 min-h-[44px]">
          <span className="text-sm text-slate-600 inline-flex items-center" aria-label={displayName ? `Signed in as ${displayName}` : "Signed in"}>
            Hi, {displayName ?? "there"}
          </span>
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setMobileMenuOpen(false);
              setSigningOut(true);
              await signOut();
              navigate("/");
            }}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-50"
            aria-label="Sign out"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              openAuthModal("register");
              setMobileMenuOpen(false);
            }}
            className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0 inline-flex items-center justify-center"
            aria-label="Register"
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal("login");
              setMobileMenuOpen(false);
            }}
            className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0 inline-flex items-center justify-center"
            aria-label="Login"
          >
            Login
          </button>
        </>
      )}
    </>
  );

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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-h-[44px]">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden -m-2 p-2 text-slate-600 hover:text-slate-900"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>
          <Link
            to="/"
            className="text-lg sm:text-2xl font-bold text-slate-900 shrink-0 hover:text-blue-600 transition-colors flex items-center"
          >
            TheUKCATPeople
          </Link>
        </div>
        <nav className="hidden sm:flex items-center gap-2 sm:gap-4">{navLinks}</nav>
        {mobileMenuOpen && (
          <div
            className="absolute left-0 right-0 top-full border-b border-slate-200 bg-white shadow-lg sm:hidden z-20"
            aria-hidden="false"
          >
            <nav className="flex flex-col px-4 py-3 gap-0 max-h-[70vh] overflow-y-auto [&>a]:w-full [&>a]:justify-start [&>button]:w-full [&>button]:justify-start [&>div]:w-full">
              {navLinks}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
