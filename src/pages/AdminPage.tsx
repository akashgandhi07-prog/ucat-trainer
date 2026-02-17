import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import { supabase } from "../lib/supabase";
import { dashboardLog } from "../lib/logger";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type AdminStats = {
  total_users: number;
  total_sessions: number;
  sessions_speed_reading: number;
  sessions_rapid_recall: number;
  sessions_keyword_scanning: number;
  bug_reports_count: number;
  suggestions_count: number;
};

type FeedbackRow = {
  id: string;
  user_id: string | null;
  type: "bug" | "suggestion";
  description: string;
  page_url: string | null;
  created_at: string;
};

type FeedbackFilter = "all" | "bug" | "suggestion";

export default function AdminPage() {
  const {
    user,
    profile,
    loading: authLoading,
    isAdmin,
    sessionLoadFailed,
  } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data: statsData, error: statsErr } = await supabase.rpc("get_admin_stats");
      if (!mounted) return;
      if (statsErr) {
        dashboardLog.error("Admin stats failed", { message: statsErr.message, code: statsErr.code });
        setError("Failed to load stats.");
        setLoading(false);
        return;
      }
      setStats(statsData as AdminStats);

      const { data: feedbackData, error: feedbackErr } = await supabase
        .from("bug_reports")
        .select("id, user_id, type, description, page_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!mounted) return;
      if (feedbackErr) {
        dashboardLog.warn("Admin feedback fetch failed", { message: feedbackErr.message });
      } else {
        setFeedback((feedbackData as FeedbackRow[]) ?? []);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user, isAdmin]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-slate-900 font-medium rounded-lg ring-2 ring-blue-600 opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  if (authLoading || (user && profile === null && loading)) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-slate-600">Loading admin area…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-8 flex items-center justify-center"
          tabIndex={-1}
        >
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            {sessionLoadFailed ? (
              <>
                <p className="text-red-700 font-medium mb-2">
                  We couldn&apos;t verify your admin access right now.
                </p>
                <p className="text-slate-700 text-sm mb-4">
                  Check your connection, then try again.
                </p>
                <Link
                  to="/"
                  className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-blue-600 font-medium hover:underline"
                >
                  Back to Home
                </Link>
              </>
            ) : (
              <>
                <p className="text-slate-900 font-medium mb-2">
                  Sign in as an admin to view this page.
                </p>
                <p className="text-slate-700 text-sm mb-4">
                  You&apos;ll need an admin account to access platform stats and feedback.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-8 flex items-center justify-center"
          tabIndex={-1}
        >
          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
            <p className="text-slate-900 font-medium mb-2">
              You don&apos;t have access to the admin dashboard.
            </p>
            <p className="text-slate-700 text-sm mb-4">
              If you think this is a mistake, contact the site owner.
            </p>
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-blue-600 font-medium hover:underline"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-slate-600">Loading admin dashboard…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex flex-col items-center justify-center p-4"
          tabIndex={-1}
        >
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Back to Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 py-8" tabIndex={-1}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
          <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-blue-600 font-medium hover:underline">
            Back to Home
          </Link>
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total users</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_users ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total sessions</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.total_sessions ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Bug reports</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.bug_reports_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Suggestions</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.suggestions_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Speed reading sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_speed_reading ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Rapid recall sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_rapid_recall ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Keyword scanning sessions</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.sessions_keyword_scanning ?? 0}</p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent feedback</h2>
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(["all", "bug", "suggestion"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFeedbackFilter(f)}
                  className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                    feedbackFilter === f
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {f === "all" ? "All" : f === "bug" ? "Bugs" : "Suggestions"}
                </button>
              ))}
            </div>
          </div>
          {feedback.length === 0 ? (
            <p className="text-slate-500">No feedback yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <ul className="divide-y divide-slate-200">
                {feedback
                  .filter((r) => feedbackFilter === "all" || r.type === feedbackFilter)
                  .map((r) => (
                    <li key={r.id} className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            r.type === "bug"
                              ? "bg-red-100 text-red-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {r.type === "bug" ? "Bug" : "Suggestion"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900 whitespace-pre-wrap">{r.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r.page_url && <span>{r.page_url} · </span>}
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
