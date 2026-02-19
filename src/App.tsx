import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "sonner";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { BugReportProvider } from "./contexts/BugReportContext";
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
import QuantitativeReasoningPage from "./pages/QuantitativeReasoningPage";
import DecisionMakingPage from "./pages/DecisionMakingPage";
import SyllogismMicroPage from "./pages/SyllogismMicroPage";
import SyllogismMacroPage from "./pages/SyllogismMacroPage";
import { PageViewTracker } from "./components/analytics/PageViewTracker";

const Dashboard = lazy(() => import("./pages/Dashboard"));

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
                <Routes>
                  {/* Primary keyword-rich URLs */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/ucat-verbal-reasoning-practice" element={<VerbalReasoningPage />} />
                  <Route path="/ucat-quantitative-reasoning-practice" element={<QuantitativeReasoningPage />} />
                  <Route path="/ucat-verbal-reasoning-speed-reading-trainer" element={<ReaderPage />} />
                  <Route path="/ucat-rapid-recall-trainer" element={<RapidRecallPage />} />
                  <Route path="/ucat-keyword-scanning-trainer" element={<KeywordScanningPage />} />
                  <Route path="/ucat-inference-trainer" element={<InferenceTrainerPage />} />
                  <Route path="/ucat-decision-making-practice" element={<DecisionMakingPage />} />
                  <Route path="/ucat-mental-maths-trainer" element={<MentalMathsPage />} />
                  <Route path="/ucat-syllogism-practice-macro-drills" element={<SyllogismMacroPage />} />

                  {/* Legacy paths redirected to new, keyword-rich URLs */}
                  <Route path="/verbal" element={<Navigate to="/ucat-verbal-reasoning-practice" replace />} />
                  <Route path="/quantitative" element={<Navigate to="/ucat-quantitative-reasoning-practice" replace />} />
                  <Route path="/reader" element={<Navigate to="/ucat-verbal-reasoning-speed-reading-trainer" replace />} />
                  <Route path="/train/rapid-recall" element={<Navigate to="/ucat-rapid-recall-trainer" replace />} />
                  <Route path="/train/keyword-scanning" element={<Navigate to="/ucat-keyword-scanning-trainer" replace />} />
                  <Route path="/train/inference" element={<Navigate to="/ucat-inference-trainer" replace />} />
                  <Route path="/decision-making" element={<Navigate to="/ucat-decision-making-practice" replace />} />
                  <Route path="/train/mentalMaths" element={<Navigate to="/ucat-mental-maths-trainer" replace />} />
                  <Route path="/train/syllogism/macro" element={<Navigate to="/ucat-syllogism-practice-macro-drills" replace />} />

                  {/* Other trainers / utility routes (URLs kept as-is) */}
                  <Route path="/configure" element={<ConfigureRedirect />} />
                  <Route path="/train/calculator" element={<CalculatorPage />} />
                  <Route path="/train/syllogism/micro" element={<SyllogismMicroPage />} />
                  <Route path="/dashboard" element={<Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">Loading…</div>}><Dashboard /></Suspense>} />
                  <Route path="/admin" element={<AdminPage />} />
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
