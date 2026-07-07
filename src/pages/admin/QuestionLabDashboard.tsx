import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import QuestionLabWorkflow from "../../components/admin/QuestionLabWorkflow";
import { type Tab } from "./questionLab/shared";
import QuestionsTab from "./questionLab/QuestionsTab";
import ReviewQueueTab from "./questionLab/ReviewQueueTab";
import ReportsTab from "./questionLab/ReportsTab";
import CoverageTab from "./questionLab/CoverageTab";
import CsvReviewTab from "./questionLab/CsvReviewTab";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestionLabDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("questions");

  const skipLinkClass =
    "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 " +
    "focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded focus:shadow-lg";

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>Skip to main content</a>
        <Header />
        <main id="main-content" className="flex-1 flex items-center justify-center" tabIndex={-1}>
          <p className="text-muted-foreground">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>Skip to main content</a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4 text-center"
          tabIndex={-1}
        >
          <AlertCircle className="w-10 h-10 text-zinc-400" />
          <p className="text-zinc-600">
            {!user ? "Sign in as an admin to access the Question Lab." : "You don't have admin access."}
          </p>
          <Link to="/admin" className="text-sm text-zinc-500 underline">Back to Admin</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "questions", label: "Trainer Questions" },
    { id: "queue",     label: "Review Queue" },
    { id: "reports",   label: "Reports" },
    { id: "coverage",  label: "Coverage" },
    { id: "csv",       label: "CSV Review" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <a href="#main-content" className={skipLinkClass}>Skip to main content</a>
      <Header />
      <main
        id="main-content"
        className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Question Lab</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Manage and review skills-trainer questions.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              to="/admin"
              className="px-3 py-1.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50"
            >
              ← Analytics
            </Link>
            <Link
              to="/admin/question-lab/gold-standards"
              className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50"
            >
              Official examples
            </Link>
            <Link
              to="/admin/question-lab/output-specs"
              className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded text-zinc-600 hover:bg-zinc-50"
            >
              Output formats
            </Link>
          </div>
        </div>

        <QuestionLabWorkflow />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "questions" && <QuestionsTab />}
        {tab === "queue"     && <ReviewQueueTab />}
        {tab === "reports"   && <ReportsTab />}
        {tab === "coverage"  && <CoverageTab />}
        {tab === "csv"       && <CsvReviewTab />}
      </main>
      <Footer />
    </div>
  );
}
