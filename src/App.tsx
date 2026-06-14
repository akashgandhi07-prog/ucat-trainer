import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { Toaster } from "sonner";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { BugReportProvider } from "./contexts/BugReportContext";
import AppShell from "./components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import { WindowScrollToTop } from "./components/layout/ScrollRestoration";

// Route-level code splitting: every page below loads as its own chunk on first
// visit instead of shipping in the initial bundle. AppShell and LandingPage stay
// eager so the first paint of "/" needs no extra round trip.
const VerbalReasoningPage = lazyWithRetry(() => import("./pages/VerbalReasoningPage"), "VerbalReasoningPage");
const ReaderPage = lazyWithRetry(() => import("./pages/ReaderPage"), "ReaderPage");
const RapidRecallPage = lazyWithRetry(() => import("./pages/RapidRecallPage"), "RapidRecallPage");
const KeywordScanningPage = lazyWithRetry(() => import("./pages/KeywordScanningPage"), "KeywordScanningPage");
const InferenceTrainerPage = lazyWithRetry(() => import("./pages/InferenceTrainerPage"), "InferenceTrainerPage");
const NotExceptTrainerPage = lazyWithRetry(() => import("./pages/NotExceptTrainerPage"), "NotExceptTrainerPage");
const AdminPage = lazyWithRetry(() => import("./pages/AdminPage"), "AdminPage");
const GoldStandardFilesPage = lazyWithRetry(() => import("./pages/admin/GoldStandardFilesPage"), "GoldStandardFilesPage");
const OutputSpecsFilesPage = lazyWithRetry(() => import("./pages/admin/OutputSpecsFilesPage"), "OutputSpecsFilesPage");
const QuestionLabDashboard = lazyWithRetry(() => import("./pages/admin/QuestionLabDashboard"), "QuestionLabDashboard");
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage"), "ResetPasswordPage");
const CalculatorPage = lazyWithRetry(() => import("./pages/CalculatorPage"), "CalculatorPage");
const MentalMathsPage = lazyWithRetry(() => import("./pages/MentalMathsPage"), "MentalMathsPage");
const ConversionsTrainerPage = lazyWithRetry(() => import("./pages/ConversionsTrainerPage"), "ConversionsTrainerPage");
const QuantitativeReasoningPage = lazyWithRetry(() => import("./pages/QuantitativeReasoningPage"), "QuantitativeReasoningPage");
const DecisionMakingPage = lazyWithRetry(() => import("./pages/DecisionMakingPage"), "DecisionMakingPage");
const StudyGuidesPage = lazyWithRetry(() => import("./pages/StudyGuidesPage"), "StudyGuidesPage");
const SyllogismFoundationPage = lazyWithRetry(() => import("./pages/SyllogismFoundationPage"), "SyllogismFoundationPage");
const SyllogismMicroPage = lazyWithRetry(() => import("./pages/SyllogismMicroPage"), "SyllogismMicroPage");
const SyllogismMacroPage = lazyWithRetry(() => import("./pages/SyllogismMacroPage"), "SyllogismMacroPage");
const VennLogicTrainerPage = lazyWithRetry(() => import("./pages/VennLogicTrainerPage"), "VennLogicTrainerPage");
const DataLogicTrainerPage = lazyWithRetry(() => import("./pages/DataLogicTrainerPage"), "DataLogicTrainerPage");
const ArgumentJudgeTrainerPage = lazyWithRetry(() => import("./pages/ArgumentJudgeTrainerPage"), "ArgumentJudgeTrainerPage");
const SJTHubPage = lazyWithRetry(() => import("./pages/SJTHubPage"), "SJTHubPage");
const SJTAppropriatenessPage = lazyWithRetry(() => import("./pages/SJTAppropriatenessPage"), "SJTAppropriatenessPage");
const SJTImportancePage = lazyWithRetry(() => import("./pages/SJTImportancePage"), "SJTImportancePage");
const SJTRankingPage = lazyWithRetry(() => import("./pages/SJTRankingPage"), "SJTRankingPage");
const StudyPlanPage = lazyWithRetry(() => import("./pages/planner/StudyPlanPage"), "StudyPlanPage");
const StudyPlanTodayPage = lazyWithRetry(() => import("./pages/planner/StudyPlanTodayPage"), "StudyPlanTodayPage");
const StudyPlanPlanPage = lazyWithRetry(() => import("./pages/planner/StudyPlanPlanPage"), "StudyPlanPlanPage");
const StudyPlanReflectPage = lazyWithRetry(() => import("./pages/planner/StudyPlanReflectPage"), "StudyPlanReflectPage");
const MockScoresPage = lazyWithRetry(() => import("./pages/planner/MockScoresPage"), "MockScoresPage");
const TutorLayout = lazyWithRetry(() => import("./pages/tutor/TutorLayout"), "TutorLayout");
const TutorOverviewPage = lazyWithRetry(() => import("./pages/tutor/TutorOverviewPage"), "TutorOverviewPage");
const TutorInvitePage = lazyWithRetry(() => import("./pages/tutor/TutorInvitePage"), "TutorInvitePage");
const TutorStudentPage = lazyWithRetry(() => import("./pages/tutor/TutorStudentPage"), "TutorStudentPage");
const JoinInvitePage = lazyWithRetry(() => import("./pages/tutor/JoinInvitePage"), "JoinInvitePage");
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "Dashboard");

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
    </div>
  );
}

function ConfigureRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/", search }} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <Toaster position="bottom-center" richColors closeButton />
          <AuthProvider>
            <AuthModalProvider>
              <BugReportProvider>
                <PageViewTracker />
                <WindowScrollToTop />
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/ucat-verbal-reasoning-practice" element={<VerbalReasoningPage />} />
                    <Route path="/ucat-quantitative-reasoning-practice" element={<QuantitativeReasoningPage />} />
                    <Route path="/ucat-verbal-reasoning-speed-reading-trainer" element={<ReaderPage />} />
                    <Route path="/ucat-rapid-recall-trainer" element={<RapidRecallPage />} />
                    <Route path="/ucat-keyword-scanning-trainer" element={<KeywordScanningPage />} />
                    <Route path="/ucat-inference-trainer" element={<InferenceTrainerPage />} />
                    <Route path="/ucat-vr-not-except-trainer" element={<NotExceptTrainerPage />} />
                    <Route path="/ucat-decision-making-practice" element={<DecisionMakingPage />} />
                    <Route path="/ucat-venn-logic-practice-questions" element={<VennLogicTrainerPage />} />
                    <Route path="/ucat-data-logic-practice-questions" element={<DataLogicTrainerPage />} />
                    <Route
                      path="/ucat-argument-judge-practice-questions"
                      element={<ArgumentJudgeTrainerPage />}
                    />
                    <Route path="/study-guides" element={<StudyGuidesPage />} />
                    <Route path="/ucat-mental-maths-trainer" element={<MentalMathsPage />} />
                    <Route path="/ucat-unit-conversions-trainer" element={<ConversionsTrainerPage />} />
                    <Route path="/ucat-syllogism-foundations-trainer" element={<SyllogismFoundationPage />} />
                    <Route path="/ucat-syllogism-practice-macro-drills" element={<SyllogismMacroPage />} />
                    <Route path="/ucat-sjt-practice" element={<SJTHubPage />} />
                    <Route path="/ucat-sjt-appropriateness-trainer" element={<SJTAppropriatenessPage />} />
                    <Route path="/ucat-sjt-importance-trainer" element={<SJTImportancePage />} />
                    <Route path="/ucat-sjt-ranking-trainer" element={<SJTRankingPage />} />

                    <Route path="/verbal" element={<Navigate to="/ucat-verbal-reasoning-practice" replace />} />
                    <Route path="/quantitative" element={<Navigate to="/ucat-quantitative-reasoning-practice" replace />} />
                    <Route path="/reader" element={<Navigate to="/ucat-verbal-reasoning-speed-reading-trainer" replace />} />
                    <Route path="/train/rapid-recall" element={<Navigate to="/ucat-rapid-recall-trainer" replace />} />
                    <Route path="/train/keyword-scanning" element={<Navigate to="/ucat-keyword-scanning-trainer" replace />} />
                    <Route path="/train/inference" element={<Navigate to="/ucat-inference-trainer" replace />} />
                    <Route path="/decision-making" element={<Navigate to="/ucat-decision-making-practice" replace />} />
                    <Route path="/train/mentalMaths" element={<Navigate to="/ucat-mental-maths-trainer" replace />} />
                    <Route path="/train/conversions" element={<Navigate to="/ucat-unit-conversions-trainer" replace />} />
                    <Route path="/train/syllogism/foundation" element={<Navigate to="/ucat-syllogism-foundations-trainer" replace />} />
                    <Route path="/train/syllogism/macro" element={<Navigate to="/ucat-syllogism-practice-macro-drills" replace />} />

                    <Route path="/configure" element={<ConfigureRedirect />} />
                    <Route path="/train/calculator" element={<CalculatorPage />} />
                    <Route path="/train/syllogism/micro" element={<SyllogismMicroPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/question-lab" element={<QuestionLabDashboard />} />
                    <Route path="/admin/question-lab/gold-standards" element={<GoldStandardFilesPage />} />
                    <Route path="/admin/question-lab/output-specs" element={<OutputSpecsFilesPage />} />

                    <Route path="/study-plan" element={<StudyPlanPage />} />
                    <Route path="/study-plan/today" element={<StudyPlanTodayPage />} />
                    <Route path="/study-plan/plan" element={<StudyPlanPlanPage />} />
                    <Route path="/study-plan/reflect" element={<StudyPlanReflectPage />} />
                    <Route path="/mock-scores" element={<MockScoresPage />} />
                    <Route path="/dashboard/scores" element={<Navigate to="/mock-scores" replace />} />

                    <Route path="/tutor" element={<TutorLayout />}>
                      <Route index element={<TutorOverviewPage />} />
                      <Route path="invite" element={<TutorInvitePage />} />
                      <Route path="student/:planId" element={<TutorStudentPage />} />
                    </Route>
                  </Route>

                  <Route path="/join/:token" element={<JoinInvitePage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>
                </Suspense>
              </BugReportProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
