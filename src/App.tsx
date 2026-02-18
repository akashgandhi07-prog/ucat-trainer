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
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/verbal" element={<VerbalReasoningPage />} />
                  <Route path="/quantitative" element={<QuantitativeReasoningPage />} />
                  <Route path="/configure" element={<ConfigureRedirect />} />
                  <Route path="/reader" element={<ReaderPage />} />
                  <Route path="/train/calculator" element={<CalculatorPage />} />
                  <Route path="/train/mentalMaths" element={<MentalMathsPage />} />
                  <Route path="/train/rapid-recall" element={<RapidRecallPage />} />
                  <Route path="/train/keyword-scanning" element={<KeywordScanningPage />} />
                  <Route path="/train/inference" element={<InferenceTrainerPage />} />
                  <Route path="/decision-making" element={<DecisionMakingPage />} />
                  <Route path="/train/syllogism/micro" element={<SyllogismMicroPage />} />
                  <Route path="/train/syllogism/macro" element={<SyllogismMacroPage />} />
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
