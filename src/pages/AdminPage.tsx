import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAuthModal } from "../contexts/AuthModalContext";
import { useToast } from "../contexts/ToastContext";
import { supabase } from "../lib/supabase";
import { dashboardLog } from "../lib/logger";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import AdminBugFeedbackSection from "../components/admin/AdminBugFeedbackSection";
import AdminQuestionFeedbackSection from "../components/admin/AdminQuestionFeedbackSection";
import AdminAnalyticsSection from "../components/admin/AdminAnalyticsSection";
import AdminPerUserActivitySection from "../components/admin/AdminPerUserActivitySection";
import AdminRegistrationsSection from "../components/admin/AdminRegistrationsSection";
import AdminNewUsersSection from "../components/admin/AdminNewUsersSection";
import { resolveFlaggedQuestion, type ResolvedQuestion } from "../lib/resolveFlaggedQuestion";
import {
  loadQuestionOverrides,
  setQuestionHidden,
  saveQuestionOverride,
  overrideKeyForIdentifier,
  type QuestionOverrideMap,
} from "../lib/questionOverrides";

type AdminStats = {
  total_users: number;
  total_sessions: number;
  sessions_speed_reading: number;
  sessions_rapid_recall: number;
  sessions_keyword_scanning: number;
  sessions_calculator: number;
  sessions_inference_trainer: number;
  sessions_mental_maths?: number;
  syllogism_sessions_count: number;
  bug_reports_count: number;
  suggestions_count: number;
};

export type UsageSummaryPayload = {
  total_sessions: number;
  total_questions: number;
  total_time_seconds?: number;
  active_users: number;
  guest_sessions: number;
  new_users: number;
};

export type TrainerUsagePayload = Record<string, number>;

export type AdminUserRow = {
  user_id: string;
  email: string;
  display_name?: string;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct?: number;
  session_questions?: number;
  total_time_seconds?: number;
  days_active?: number;
  last_wpm?: number | null;
  avg_wpm?: number | null;
  last_active_at: string | null;
};

type RegistrationRow = {
  user_id: string;
  email: string;
  display_name?: string;
  stream?: string | null;
  entry_year?: string | null;
  created_at: string | null;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct?: number;
  session_questions?: number;
  total_time_seconds?: number;
  trainer_questions?: Record<string, number>;
  trainer_time_seconds?: Record<string, number>;
  days_active?: number;
  last_wpm?: number | null;
  avg_wpm?: number | null;
  last_active_at: string | null;
};

const REGISTRATION_TRAINER_USAGE: {
  key: string;
  label: string;
  sessionsKey: keyof RegistrationRow;
}[] = [
  { key: "speed_reading", label: "Speed reading", sessionsKey: "speed_reading" },
  { key: "rapid_recall", label: "Rapid recall", sessionsKey: "rapid_recall" },
  { key: "keyword_scanning", label: "Keyword scanning", sessionsKey: "keyword_scanning" },
  { key: "calculator", label: "Calculator", sessionsKey: "calculator" },
  { key: "inference_trainer", label: "Inference", sessionsKey: "inference_trainer" },
  { key: "mental_maths", label: "Mental maths", sessionsKey: "mental_maths" },
  { key: "syllogism_micro", label: "Syllogism micro", sessionsKey: "syllogism_micro" },
  { key: "syllogism_macro", label: "Syllogism macro", sessionsKey: "syllogism_macro" },
];

function getRegistrationTrainerUsage(row: RegistrationRow) {
  return REGISTRATION_TRAINER_USAGE.map(({ key, label, sessionsKey }) => {
    const sessions = Number(row[sessionsKey] ?? 0);
    const questions = Number(row.trainer_questions?.[key] ?? 0);
    const timeSeconds = Number(row.trainer_time_seconds?.[key] ?? 0);
    return { key, label, sessions, questions, timeSeconds };
  }).filter((t) => t.sessions > 0 || t.questions > 0 || t.timeSeconds > 0);
}

type UsageSummaryResponse = {
  summary: UsageSummaryPayload;
  trainer_usage: TrainerUsagePayload;
  trainer_questions?: Record<string, number>;
  trainer_time_seconds?: Record<string, number>;
  guest_activity: Record<string, number>;
  users: AdminUserRow[];
};

type NewUserRow = {
  user_id: string;
  full_name: string | null;
  created_at: string;
  email: string;
  speed_reading: number;
  rapid_recall: number;
  keyword_scanning: number;
  calculator: number;
  inference_trainer: number;
  mental_maths: number;
  syllogism_micro: number;
  syllogism_macro: number;
  total_questions: number;
  session_correct: number;
  event_counts: Record<string, number>;
};

type FeedbackRow = {
  id: string;
  user_id: string | null;
  type: "bug" | "suggestion";
  description: string;
  page_url: string | null;
  created_at: string;
  archived_at: string | null;
};

type FeedbackFilter = "all" | "bug" | "suggestion";

import type {
  QuestionFeedbackIssueType,
} from "../lib/questionFeedback";

type QuestionFeedbackRow = {
  id: string;
  user_id: string | null;
  trainer_type: string;
  question_kind: string;
  question_identifier: string;
  issue_type: QuestionFeedbackIssueType;
  comment: string | null;
  passage_id: string | null;
  session_id: string | null;
  page_url: string | null;
  created_at: string;
};

export type AdminDateRange = "all" | "7" | "30" | "90";

type AnalyticsSummary = {
  event_counts: Record<string, number>;
  by_day: Array<{ date: string; events: Record<string, number> }>;
  trainer_by_type: Record<string, number>;
  funnel: Record<string, Record<string, number>>;
  unique_sessions: number;
  unique_users: number;
  signups_by_day?: Array<{ date: string; signups: number }>;
};

function getDateRangeParams(range: AdminDateRange): { since_ts: string | null; until_ts: string | null } {
  if (range === "all") return { since_ts: null, until_ts: null };
  const days = parseInt(range, 10);
  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - days);
  return { since_ts: since.toISOString(), until_ts: until.toISOString() };
}

function formatTimeSeconds(seconds: number | undefined | null): string {
  if (seconds == null || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export default function AdminPage() {
  const {
    user,
    profile,
    loading: authLoading,
    isAdmin,
    sessionLoadFailed,
  } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState<AdminDateRange>("30");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>("all");
  type FeedbackView = "active" | "archived";
  const [feedbackView, setFeedbackView] = useState<FeedbackView>("active");
  const [feedbackUpdatingIds, setFeedbackUpdatingIds] = useState<Set<string>>(new Set());
  const [questionFeedback, setQuestionFeedback] = useState<QuestionFeedbackRow[]>([]);
  const [expandedQF, setExpandedQF] = useState<Set<string>>(new Set());
  const [qfDismissing, setQfDismissing] = useState<Set<string>>(new Set());
  const [qfDeleting, setQfDeleting] = useState<Set<string>>(new Set());
  const [qfResolved, setQfResolved] = useState<Map<string, ResolvedQuestion | "loading">>(new Map());
  const [qfOverrides, setQfOverrides] = useState<QuestionOverrideMap>(new Map());
  const [qfHiding, setQfHiding] = useState<Set<string>>(new Set());
  const [qfEditing, setQfEditing] = useState<string | null>(null);
  const [qfEditForm, setQfEditForm] = useState<Record<string, string>>({});
  const [qfSaving, setQfSaving] = useState<Set<string>>(new Set());
  const [qfTrainerFilter, setQfTrainerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type UserSortKey = keyof AdminUserRow | "accuracy";
  const [userSortKey, setUserSortKey] = useState<UserSortKey>("total_questions");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  const [userFilterMinQuestions, setUserFilterMinQuestions] = useState<number>(0);
  const [userFilterEmail, setUserFilterEmail] = useState<string>("");
  const [newUsers, setNewUsers] = useState<NewUserRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  type RegistrationSortKey = keyof RegistrationRow;
  const [registrationSortKey, setRegistrationSortKey] = useState<RegistrationSortKey>("created_at");
  const [registrationSortDir, setRegistrationSortDir] = useState<"asc" | "desc">("desc");
  const [registrationFilterQuery, setRegistrationFilterQuery] = useState<string>("");
  const [expandedSignUpIds, setExpandedSignUpIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !isAdmin) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- stop loading when auth resolved */
      setLoading(false);
      return;
    }

    let mounted = true;
    const { since_ts, until_ts } = getDateRangeParams(dateRange);
    const rpcParams = { since_ts, until_ts };

    (async () => {
      const [statsRes, analyticsRes, usageRes, newUsersRes, registrationsRes] = await Promise.all([
        supabase.rpc("get_admin_stats", rpcParams),
        supabase.rpc("get_analytics_summary", rpcParams),
        supabase.rpc("get_admin_usage_summary", rpcParams),
        supabase.rpc("get_admin_new_users", { ...rpcParams, limit_rows: 300 }),
        supabase.rpc("get_admin_registrations_overview", { limit_rows: 5000 }),
      ]);
      if (!mounted) return;
      if (statsRes.error) {
        dashboardLog.error("Admin stats failed", { message: statsRes.error.message, code: statsRes.error.code });
        setError("Failed to load stats.");
        setLoading(false);
        return;
      }
      setStats(statsRes.data as AdminStats);
      if (analyticsRes.error) {
        dashboardLog.warn("Admin analytics failed", { message: analyticsRes.error.message });
        setAnalytics(null);
      } else {
        setAnalytics(analyticsRes.data as AnalyticsSummary);
      }
      if (usageRes.error) {
        dashboardLog.warn("Admin usage summary failed", { message: usageRes.error.message });
        setUsageSummary(null);
      } else {
        setUsageSummary(usageRes.data as UsageSummaryResponse);
      }
      if (newUsersRes.error) {
        dashboardLog.warn("Admin new users failed", { message: newUsersRes.error.message });
        setNewUsers([]);
      } else {
        setNewUsers((newUsersRes.data as NewUserRow[]) ?? []);
      }

      if (registrationsRes.error) {
        dashboardLog.warn("Admin registrations failed", { message: registrationsRes.error.message });
        setRegistrations([]);
      } else {
        setRegistrations((registrationsRes.data as RegistrationRow[]) ?? []);
      }

      const { data: feedbackData, error: feedbackErr } = await supabase
        .from("bug_reports")
        .select("id, user_id, type, description, page_url, created_at, archived_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      if (feedbackErr) {
        dashboardLog.warn("Admin feedback fetch failed", { message: feedbackErr.message });
      } else {
        setFeedback(
          ((feedbackData as FeedbackRow[]) ?? []).map((row) => ({
            ...row,
            archived_at: row.archived_at ?? null,
          }))
        );
      }

      const { data: qfData, error: qfErr } = await supabase
        .from("question_feedback")
        .select(
          "id, user_id, trainer_type, question_kind, question_identifier, issue_type, comment, passage_id, session_id, page_url, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (!mounted) return;
      if (qfErr) {
        dashboardLog.warn("Admin question feedback fetch failed", {
          message: qfErr.message,
          code: qfErr.code,
        });
      } else {
        setQuestionFeedback((qfData as QuestionFeedbackRow[]) ?? []);
      }

      const overridesMap = await loadQuestionOverrides();
      if (!mounted) return;
      setQfOverrides(overridesMap);

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user, isAdmin, dateRange]);

  const skipLinkClass =
    "absolute left-4 top-4 z-[100] px-4 py-2 bg-white text-foreground font-medium rounded-lg ring-2 ring-primary opacity-0 focus:opacity-100 focus:outline-none pointer-events-none focus:pointer-events-auto";

  if (authLoading || (user && profile === null && loading)) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-muted-foreground">Loading admin area…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-8 flex items-center justify-center"
          tabIndex={-1}
        >
          <div className="w-full bg-card rounded-xl border border-border p-6 text-center">
            {sessionLoadFailed ? (
              <>
                <p className="text-red-700 font-medium mb-2">
                  We couldn&apos;t verify your admin access right now.
                </p>
                <p className="text-foreground text-sm mb-4">
                  Check your connection, then try again.
                </p>
                <Link
                  to="/"
                  className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-primary font-medium hover:underline"
                >
                  Back to Home
                </Link>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium mb-2">
                  Sign in as an admin to view this page.
                </p>
                <p className="text-foreground text-sm mb-4">
                  You&apos;ll need an admin account to access platform stats and feedback.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="min-h-[44px] px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
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
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 max-w-2xl mx-auto px-4 py-8 flex items-center justify-center"
          tabIndex={-1}
        >
          <div className="w-full bg-card rounded-xl border border-border p-6 text-center">
            <p className="text-foreground font-medium mb-2">
              You don&apos;t have access to the admin dashboard.
            </p>
            <p className="text-foreground text-sm mb-4">
              If you think this is a mistake, contact the site owner.
            </p>
            <Link
              to="/"
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 text-primary font-medium hover:underline"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isFeedbackUpdating = (id: string): boolean => feedbackUpdatingIds.has(id);

  const ensureResolved = (questionIdentifier: string, questionKind: string) => {
    if (qfResolved.has(questionIdentifier)) return;
    setQfResolved((prev) => new Map(prev).set(questionIdentifier, "loading"));
    resolveFlaggedQuestion(questionIdentifier, questionKind)
      .then((res) =>
        setQfResolved((prev) => new Map(prev).set(questionIdentifier, res)),
      )
      .catch(() =>
        setQfResolved((prev) =>
          new Map(prev).set(questionIdentifier, {
            kind: "unknown",
            resolved: false,
            message: "Failed to resolve this question.",
          }),
        ),
      );
  };

  const handleToggleHide = async (
    questionIdentifier: string,
    questionKind: string,
    trainerType: string,
    hide: boolean,
  ) => {
    setQfHiding((prev) => new Set(prev).add(questionIdentifier));
    try {
      await setQuestionHidden(questionIdentifier, hide, { questionKind, trainerType });
      const fresh = await loadQuestionOverrides();
      setQfOverrides(fresh);
    } catch (e) {
      dashboardLog.warn("Admin hide/unhide question failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setQfHiding((prev) => {
        const next = new Set(prev);
        next.delete(questionIdentifier);
        return next;
      });
    }
  };

  const startEditQuestion = (questionIdentifier: string, resolved: ResolvedQuestion) => {
    const key = overrideKeyForIdentifier(questionIdentifier);
    const existing = (qfOverrides.get(key)?.override ?? {}) as Record<string, unknown>;
    const v = (k: string, fallback?: string) =>
      typeof existing[k] === "string" ? (existing[k] as string) : fallback ?? "";
    let form: Record<string, string> = {};
    if (resolved.kind === "dm") {
      form = {
        stem: v("stem", resolved.stem),
        question: v("question", resolved.question),
        correctAnswer: v("correctAnswer", resolved.correctAnswer),
        explanation: v("explanation", resolved.explanation),
      };
      const existingOpts = Array.isArray(existing.options)
        ? (existing.options as { id?: string; text?: string }[])
        : null;
      (resolved.options ?? []).forEach((o) => {
        const fromOverride = existingOpts?.find((eo) => eo.id === o.id)?.text;
        if (o.id) form[`opt_${o.id}`] = typeof fromOverride === "string" ? fromOverride : o.text;
      });
    } else if (resolved.kind === "inference") {
      form = { questionText: v("questionText", resolved.stem), explanation: v("explanation", resolved.explanation) };
    } else if (resolved.kind === "syllogism") {
      form = {
        stimulus_text: v("stimulus_text", resolved.stem),
        conclusion_text: v("conclusion_text", resolved.question),
        explanation: v("explanation", resolved.explanation),
      };
    } else if (resolved.kind === "sjt") {
      form = { stem: v("stem", resolved.stem), pivotInsight: v("pivotInsight", resolved.explanation) };
    }
    setQfEditForm(form);
    setQfEditing(questionIdentifier);
  };

  const saveEditQuestion = async (
    questionIdentifier: string,
    resolved: ResolvedQuestion,
    questionKind: string,
    trainerType: string,
  ) => {
    setQfSaving((prev) => new Set(prev).add(questionIdentifier));
    try {
      let override: Record<string, unknown> = {};
      if (resolved.kind === "dm") {
        override = {
          stem: qfEditForm.stem,
          question: qfEditForm.question,
          correctAnswer: qfEditForm.correctAnswer,
          explanation: qfEditForm.explanation,
          options: (resolved.options ?? []).map((o) => ({
            id: o.id,
            text: o.id ? qfEditForm[`opt_${o.id}`] ?? o.text : o.text,
            ...(o.label ? { label: o.label } : {}),
          })),
        };
      } else if (resolved.kind === "inference") {
        override = { questionText: qfEditForm.questionText, explanation: qfEditForm.explanation };
      } else if (resolved.kind === "syllogism") {
        override = {
          stimulus_text: qfEditForm.stimulus_text,
          conclusion_text: qfEditForm.conclusion_text,
          explanation: qfEditForm.explanation,
        };
      } else if (resolved.kind === "sjt") {
        override = { stem: qfEditForm.stem, pivotInsight: qfEditForm.pivotInsight };
      }
      await saveQuestionOverride(questionIdentifier, override, { questionKind, trainerType });
      const fresh = await loadQuestionOverrides();
      setQfOverrides(fresh);
      setQfEditing(null);
    } catch (e) {
      dashboardLog.warn("Admin save question override failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setQfSaving((prev) => {
        const next = new Set(prev);
        next.delete(questionIdentifier);
        return next;
      });
    }
  };

  const handleDismissQuestionFeedback = async (questionIdentifier: string) => {
    setQfDismissing((prev) => new Set(prev).add(questionIdentifier));
    const { error: delErr } = await supabase
      .from("question_feedback")
      .delete()
      .eq("question_identifier", questionIdentifier);
    if (delErr) {
      dashboardLog.warn("Admin question feedback dismiss failed", {
        message: delErr.message,
        code: delErr.code,
      });
    } else {
      setQuestionFeedback((prev) =>
        prev.filter((r) => r.question_identifier !== questionIdentifier)
      );
      setExpandedQF((prev) => {
        const next = new Set(prev);
        next.delete(questionIdentifier);
        return next;
      });
    }
    setQfDismissing((prev) => {
      const next = new Set(prev);
      next.delete(questionIdentifier);
      return next;
    });
  };

  const handleDeleteQuestion = async (
    questionKind: string,
    questionIdentifier: string,
    trainerType: string,
  ) => {
    const isSyllogism = questionKind === "dm_syllogism";
    if (!isSyllogism) return;
    // Extract ID from identifiers like "syllogism:abc123" or "syllogism_block:abc123"
    const parts = questionIdentifier.split(":");
    const rawId = parts.length >= 2 ? parts.slice(1).join(":") : null;
    if (!rawId) return;
    // Foundation / micro / macro questions all live in public.syllogism_questions.
    // Any other syllogism trainer type is a legacy kind with no table to delete from.
    const newSyllogismTrainers = ["syllogism_foundation", "syllogism_micro", "syllogism_macro"];
    if (!newSyllogismTrainers.includes(trainerType)) {
      showToast("Cannot delete this legacy question type.", { variant: "error" });
      return;
    }
    setQfDeleting((prev) => new Set(prev).add(questionIdentifier));
    // Verify the delete actually removed a row: RLS or a stale id can make the
    // request succeed while deleting nothing, so treat an empty result as failure.
    const { data: deletedRows, error: delErr } = await supabase
      .from("syllogism_questions")
      .delete()
      .eq("id", rawId)
      .select("id");
    if (delErr || !deletedRows || deletedRows.length === 0) {
      dashboardLog.warn("Admin delete syllogism question failed", {
        message: delErr?.message ?? "no rows deleted",
        code: delErr?.code,
      });
      showToast("Failed to delete question. Nothing was removed.", {
        variant: "error",
      });
    } else {
      // Also remove the feedback reports for this question
      await supabase
        .from("question_feedback")
        .delete()
        .eq("question_identifier", questionIdentifier);
      setQuestionFeedback((prev) =>
        prev.filter((r) => r.question_identifier !== questionIdentifier)
      );
      setExpandedQF((prev) => {
        const next = new Set(prev);
        next.delete(questionIdentifier);
        return next;
      });
      showToast("Question deleted.", { variant: "success" });
    }
    setQfDeleting((prev) => {
      const next = new Set(prev);
      next.delete(questionIdentifier);
      return next;
    });
  };

  const handleArchiveToggle = async (id: string, shouldArchive: boolean) => {
    setFeedbackUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const { error: updateErr } = await supabase
      .from("bug_reports")
      .update({
        archived_at: shouldArchive ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (updateErr) {
      dashboardLog.warn("Admin feedback archive toggle failed", {
        message: updateErr.message,
        code: updateErr.code,
      });
    } else {
      setFeedback((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                archived_at: shouldArchive ? new Date().toISOString() : null,
              }
            : row
        )
      );
    }
    setFeedbackUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <a href="#main-content" className={skipLinkClass}>
          Skip to main content
        </a>
        <Header />
        <main
          id="main-content"
          className="flex-1 flex items-center justify-center px-4"
          tabIndex={-1}
        >
          <p className="text-muted-foreground">Loading admin dashboard…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
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
          <Link to="/" className="text-primary font-medium hover:underline">
            Back to Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <a href="#main-content" className={skipLinkClass}>
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1 max-w-6xl mx-auto px-4 py-8" tabIndex={-1}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/question-lab"
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary"
            >
              Question Lab
            </Link>
            <Link to="/" className="min-h-[44px] inline-flex items-center justify-center py-2 text-primary font-medium hover:underline">
              Back to Home
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-muted-foreground">Date range:</span>
          <div className="flex rounded-lg border border-border p-0.5 bg-secondary">
            {(["all", "7", "30", "90"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  dateRange === r ? "bg-white text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "all" ? "All time" : `Last ${r} days`}
              </button>
            ))}
          </div>
        </div>

        {stats && usageSummary && (
          <section className="mb-8" aria-label="Key metrics">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Key metrics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-muted-foreground">Total users</p>
                <p className="text-2xl font-bold text-foreground">{stats.total_users}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-muted-foreground">New sign-ups (in range)</p>
                <p className="text-2xl font-bold text-foreground">{usageSummary.summary.new_users}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-muted-foreground">Active users (in range)</p>
                <p className="text-2xl font-bold text-foreground">{usageSummary.summary.active_users}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-muted-foreground">Total questions (in range)</p>
                <p className="text-2xl font-bold text-foreground">{Number(usageSummary.summary.total_questions).toLocaleString()}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-muted-foreground">Total time (in range)</p>
                <p className="text-2xl font-bold text-foreground">{formatTimeSeconds(usageSummary.summary.total_time_seconds)}</p>
              </div>
            </div>
          </section>
        )}

        {registrations.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-3">Recent sign-ups</h2>
            <p className="text-sm text-muted-foreground mb-3">
              All registered users, newest first. Expand a row for subject and per-trainer usage (sessions, questions, time).
            </p>
            <div className="bg-card rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-secondary">
                    <th className="px-2 py-2 text-left font-medium text-foreground w-8" aria-label="Expand" />
                    <th className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">Subject</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">Signed up</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">Last login</th>
                    <th className="px-3 py-2 text-right font-medium text-foreground whitespace-nowrap">Questions</th>
                    <th className="px-3 py-2 text-right font-medium text-foreground whitespace-nowrap">Time</th>
                    <th className="px-3 py-2 text-right font-medium text-foreground whitespace-nowrap">Days active</th>
                  </tr>
                </thead>
                <tbody>
                  {[...registrations]
                    .sort((a, b) => {
                      if (!a.created_at && !b.created_at) return 0;
                      if (!a.created_at) return 1;
                      if (!b.created_at) return -1;
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((r, i) => {
                      const isExpanded = expandedSignUpIds.has(r.user_id);
                      const trainerUsage = getRegistrationTrainerUsage(r);
                      const toggleExpanded = () => {
                        setExpandedSignUpIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.user_id)) next.delete(r.user_id);
                          else next.add(r.user_id);
                          return next;
                        });
                      };
                      return (
                        <Fragment key={r.user_id}>
                          <tr className="border-b border-border hover:bg-secondary">
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={toggleExpanded}
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? "Hide trainer usage" : "Show trainer usage"}
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                              >
                                {isExpanded ? "▾" : "▸"}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                            <td className="px-3 py-2 text-foreground font-medium whitespace-nowrap">
                              {r.display_name || <span className="text-muted-foreground italic">-</span>}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap text-xs">
                              {r.stream || "-"}
                              {r.entry_year ? (
                                <span className="block text-muted-foreground/80">{r.entry_year}</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]" title={r.email || ""}>
                              {r.email || "-"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {r.last_active_at
                                ? new Date(r.last_active_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
                                : <span className="text-muted-foreground">Never</span>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.total_questions > 0
                                ? <span className="text-foreground font-medium">{r.total_questions.toLocaleString()}</span>
                                : <span className="text-muted-foreground">0</span>}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                              {formatTimeSeconds(r.total_time_seconds)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.days_active != null && r.days_active > 0
                                ? <span className="text-foreground">{r.days_active}</span>
                                : <span className="text-muted-foreground">-</span>}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border bg-secondary/40">
                              <td colSpan={10} className="px-4 py-3">
                                {trainerUsage.length > 0 ? (
                                  <table className="w-full text-xs max-w-xl">
                                    <thead>
                                      <tr className="text-muted-foreground">
                                        <th className="py-1 pr-4 text-left font-medium">Trainer</th>
                                        <th className="py-1 px-2 text-right font-medium">Sessions</th>
                                        <th className="py-1 px-2 text-right font-medium">Questions</th>
                                        <th className="py-1 pl-2 text-right font-medium">Time</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {trainerUsage.map((t) => (
                                        <tr key={t.key}>
                                          <td className="py-1 pr-4 text-foreground">{t.label}</td>
                                          <td className="py-1 px-2 text-right tabular-nums">{t.sessions}</td>
                                          <td className="py-1 px-2 text-right tabular-nums">{t.questions.toLocaleString()}</td>
                                          <td className="py-1 pl-2 text-right tabular-nums">{formatTimeSeconds(t.timeSeconds)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No trainer activity yet.</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-4">Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Total users</p>
              <p className="text-3xl font-bold text-foreground">{stats?.total_users ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Total sessions</p>
              <p className="text-3xl font-bold text-foreground">{stats?.total_sessions ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Bug reports</p>
              <p className="text-3xl font-bold text-foreground">{stats?.bug_reports_count ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Suggestions</p>
              <p className="text-3xl font-bold text-foreground">{stats?.suggestions_count ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Speed reading sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.sessions_speed_reading ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Rapid recall sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.sessions_rapid_recall ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Keyword scanning sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.sessions_keyword_scanning ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Calculator sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.sessions_calculator ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Inference trainer sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.sessions_inference_trainer ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Mental maths sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.sessions_mental_maths ?? 0}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-muted-foreground">Syllogism sessions</p>
              <p className="text-2xl font-bold text-foreground">{stats?.syllogism_sessions_count ?? 0}</p>
            </div>
          </div>
        </section>

        {usageSummary && (
          <>
            <section className="mb-10">
              <h2 className="text-lg font-semibold text-foreground mb-4">Usage summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm font-medium text-muted-foreground">Total sessions</p>
                  <p className="text-2xl font-bold text-foreground">{usageSummary.summary.total_sessions}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm font-medium text-muted-foreground">Total questions</p>
                  <p className="text-2xl font-bold text-foreground">{Number(usageSummary.summary.total_questions).toLocaleString()}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm font-medium text-muted-foreground">Total time spent</p>
                  <p className="text-2xl font-bold text-foreground">{formatTimeSeconds(usageSummary.summary.total_time_seconds)}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm font-medium text-muted-foreground">Active users (in range)</p>
                  <p className="text-2xl font-bold text-foreground">{usageSummary.summary.active_users}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm font-medium text-muted-foreground">Guest sessions</p>
                  <p className="text-2xl font-bold text-foreground">{usageSummary.summary.guest_sessions}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm font-medium text-muted-foreground">New sign-ups (in range)</p>
                  <p className="text-2xl font-bold text-foreground">{usageSummary.summary.new_users}</p>
                </div>
              </div>
            </section>

            <AdminNewUsersSection newUsers={newUsers} />

            <AdminRegistrationsSection
              registrations={registrations}
              registrationSortKey={registrationSortKey}
              setRegistrationSortKey={setRegistrationSortKey}
              registrationSortDir={registrationSortDir}
              setRegistrationSortDir={setRegistrationSortDir}
              registrationFilterQuery={registrationFilterQuery}
              setRegistrationFilterQuery={setRegistrationFilterQuery}
            />

            <section className="mb-10">
              <h2 className="text-lg font-semibold text-foreground mb-4">Trainer usage (sessions, questions, time in range)</h2>
              {Object.keys(usageSummary.trainer_usage).length > 0 && (
                <p className="text-sm text-foreground mb-3">
                  Most used this period:{" "}
                  {Object.entries(usageSummary.trainer_usage)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([key, count]) => `${key.replace(/_/g, " ")} (${count} sessions)`)
                    .join(", ")}
                  .
                </p>
              )}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary">
                      <th className="px-4 py-2 text-left font-medium text-foreground">Trainer</th>
                      <th className="px-4 py-2 text-right font-medium text-foreground">Sessions</th>
                      <th className="px-4 py-2 text-right font-medium text-foreground">Questions</th>
                      <th className="px-4 py-2 text-right font-medium text-foreground">Time spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(usageSummary.trainer_usage)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([key, count]) => (
                        <tr key={key} className="border-b border-border">
                          <td className="px-4 py-2 text-foreground">{key.replace(/_/g, " ")}</td>
                          <td className="px-4 py-2 text-right font-medium text-foreground">{String(count)}</td>
                          <td className="px-4 py-2 text-right text-foreground">
                            {usageSummary.trainer_questions?.[key] != null
                              ? Number(usageSummary.trainer_questions[key]).toLocaleString()
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {formatTimeSeconds(usageSummary.trainer_time_seconds?.[key])}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            {Object.keys(usageSummary.guest_activity).length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-foreground mb-4">Guest activity (anon)</h2>
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <ul className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                    {Object.entries(usageSummary.guest_activity)
                      .sort(([, a], [, b]) => b - a)
                      .map(([eventName, count]) => (
                        <li key={eventName} className="px-4 py-2 flex justify-between text-sm">
                          <span className="text-foreground">{eventName}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </section>
            )}

            <AdminPerUserActivitySection
              users={usageSummary.users}
              userSortKey={userSortKey}
              setUserSortKey={setUserSortKey}
              userSortDir={userSortDir}
              setUserSortDir={setUserSortDir}
              userFilterMinQuestions={userFilterMinQuestions}
              setUserFilterMinQuestions={setUserFilterMinQuestions}
              userFilterEmail={userFilterEmail}
              setUserFilterEmail={setUserFilterEmail}
            />
          </>
        )}

        {analytics && <AdminAnalyticsSection analytics={analytics} />}
        <AdminQuestionFeedbackSection
          questionFeedback={questionFeedback}
          qfTrainerFilter={qfTrainerFilter}
          setQfTrainerFilter={setQfTrainerFilter}
          expandedQF={expandedQF}
          setExpandedQF={setExpandedQF}
          qfDismissing={qfDismissing}
          qfDeleting={qfDeleting}
          qfOverrides={qfOverrides}
          qfHiding={qfHiding}
          qfResolved={qfResolved}
          qfEditing={qfEditing}
          setQfEditing={setQfEditing}
          qfEditForm={qfEditForm}
          setQfEditForm={setQfEditForm}
          qfSaving={qfSaving}
          ensureResolved={ensureResolved}
          handleToggleHide={handleToggleHide}
          handleDismissQuestionFeedback={handleDismissQuestionFeedback}
          handleDeleteQuestion={handleDeleteQuestion}
          startEditQuestion={startEditQuestion}
          saveEditQuestion={saveEditQuestion}
        />
        <AdminBugFeedbackSection
          feedback={feedback}
          feedbackFilter={feedbackFilter}
          setFeedbackFilter={setFeedbackFilter}
          feedbackView={feedbackView}
          setFeedbackView={setFeedbackView}
          isFeedbackUpdating={isFeedbackUpdating}
          handleArchiveToggle={handleArchiveToggle}
        />
      </main>
      <Footer />
    </div>
  );
}
