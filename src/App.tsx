import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
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
const VerbalReasoningPage = lazy(() => import("./pages/VerbalReasoningPage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const RapidRecallPage = lazy(() => import("./pages/RapidRecallPage"));
const KeywordScanningPage = lazy(() => import("./pages/KeywordScanningPage"));
const InferenceTrainerPage = lazy(() => import("./pages/InferenceTrainerPage"));
const NotExceptTrainerPage = lazy(() => import("./pages/NotExceptTrainerPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const GoldStandardFilesPage = lazy(() => import("./pages/admin/GoldStandardFilesPage"));
const OutputSpecsFilesPage = lazy(() => import("./pages/admin/OutputSpecsFilesPage"));
const QuestionLabDashboard = lazy(() => import("./pages/admin/QuestionLabDashboard"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
const MentalMathsPage = lazy(() => import("./pages/MentalMathsPage"));
const ConversionsTrainerPage = lazy(() => import("./pages/ConversionsTrainerPage"));
const QuantitativeReasoningPage = lazy(() => import("./pages/QuantitativeReasoningPage"));
const DecisionMakingPage = lazy(() => import("./pages/DecisionMakingPage"));
const StudyGuidesPage = lazy(() => import("./pages/StudyGuidesPage"));
const SyllogismFoundationPage = lazy(() => import("./pages/SyllogismFoundationPage"));
const SyllogismMicroPage = lazy(() => import("./pages/SyllogismMicroPage"));
const SyllogismMacroPage = lazy(() => import("./pages/SyllogismMacroPage"));
const VennLogicTrainerPage = lazy(() => import("./pages/VennLogicTrainerPage"));
const DataLogicTrainerPage = lazy(() => import("./pages/DataLogicTrainerPage"));
const ArgumentJudgeTrainerPage = lazy(() => import("./pages/ArgumentJudgeTrainerPage"));
const SJTHubPage = lazy(() => import("./pages/SJTHubPage"));
const SJTAppropriatenessPage = lazy(() => import("./pages/SJTAppropriatenessPage"));
const SJTImportancePage = lazy(() => import("./pages/SJTImportancePage"));
const SJTRankingPage = lazy(() => import("./pages/SJTRankingPage"));
const StudyPlanPage = lazy(() => import("./pages/planner/StudyPlanPage"));
const StudyPlanTodayPage = lazy(() => import("./pages/planner/StudyPlanTodayPage"));
const StudyPlanPlanPage = lazy(() => import("./pages/planner/StudyPlanPlanPage"));
const StudyPlanReflectPage = lazy(() => import("./pages/planner/StudyPlanReflectPage"));
const MockScoresPage = lazy(() => import("./pages/planner/MockScoresPage"));
const TutorLayout = lazy(() => import("./pages/tutor/TutorLayout"));
const TutorOverviewPage = lazy(() => import("./pages/tutor/TutorOverviewPage"));
const TutorInvitePage = lazy(() => import("./pages/tutor/TutorInvitePage"));
const TutorStudentPage = lazy(() => import("./pages/tutor/TutorStudentPage"));
const JoinInvitePage = lazy(() => import("./pages/tutor/JoinInvitePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

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
