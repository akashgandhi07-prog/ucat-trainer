import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { BugReportProvider } from "./contexts/BugReportContext";
import AppShell from "./components/layout/AppShell";
import LandingPage from "./pages/LandingPage";
import VerbalReasoningPage from "./pages/VerbalReasoningPage";
import ReaderPage from "./pages/ReaderPage";
import RapidRecallPage from "./pages/RapidRecallPage";
import KeywordScanningPage from "./pages/KeywordScanningPage";
import InferenceTrainerPage from "./pages/InferenceTrainerPage";
import AdminPage from "./pages/AdminPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CalculatorPage from "./pages/CalculatorPage";
import MentalMathsPage from "./pages/MentalMathsPage";
import ConversionsTrainerPage from "./pages/ConversionsTrainerPage";
import QuantitativeReasoningPage from "./pages/QuantitativeReasoningPage";
import DecisionMakingPage from "./pages/DecisionMakingPage";
import StudyGuidesPage from "./pages/StudyGuidesPage";
import SyllogismMicroPage from "./pages/SyllogismMicroPage";
import SyllogismMacroPage from "./pages/SyllogismMacroPage";
import VennLogicTrainerPage from "./pages/VennLogicTrainerPage";
import DataLogicTrainerPage from "./pages/DataLogicTrainerPage";
import ArgumentJudgeTrainerPage from "./pages/ArgumentJudgeTrainerPage";
import SJTHubPage from "./pages/SJTHubPage";
import SJTAppropriatenessPage from "./pages/SJTAppropriatenessPage";
import SJTImportancePage from "./pages/SJTImportancePage";
import SJTRankingPage from "./pages/SJTRankingPage";
import StudyPlanPage from "./pages/planner/StudyPlanPage";
import StudyPlanTodayPage from "./pages/planner/StudyPlanTodayPage";
import StudyPlanPlanPage from "./pages/planner/StudyPlanPlanPage";
import StudyPlanReflectPage from "./pages/planner/StudyPlanReflectPage";
import MockScoresPage from "./pages/planner/MockScoresPage";
import TutorLayout from "./pages/tutor/TutorLayout";
import TutorOverviewPage from "./pages/tutor/TutorOverviewPage";
import TutorInvitePage from "./pages/tutor/TutorInvitePage";
import TutorStudentPage from "./pages/tutor/TutorStudentPage";
import JoinInvitePage from "./pages/tutor/JoinInvitePage";
import Dashboard from "./pages/Dashboard";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import { WindowScrollToTop } from "./components/layout/ScrollRestoration";

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
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/ucat-verbal-reasoning-practice" element={<VerbalReasoningPage />} />
                    <Route path="/ucat-quantitative-reasoning-practice" element={<QuantitativeReasoningPage />} />
                    <Route path="/ucat-verbal-reasoning-speed-reading-trainer" element={<ReaderPage />} />
                    <Route path="/ucat-rapid-recall-trainer" element={<RapidRecallPage />} />
                    <Route path="/ucat-keyword-scanning-trainer" element={<KeywordScanningPage />} />
                    <Route path="/ucat-inference-trainer" element={<InferenceTrainerPage />} />
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
                    <Route path="/train/syllogism/macro" element={<Navigate to="/ucat-syllogism-practice-macro-drills" replace />} />

                    <Route path="/configure" element={<ConfigureRedirect />} />
                    <Route path="/train/calculator" element={<CalculatorPage />} />
                    <Route path="/train/syllogism/micro" element={<SyllogismMicroPage />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/admin" element={<AdminPage />} />

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
              </BugReportProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
