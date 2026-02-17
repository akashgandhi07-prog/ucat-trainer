import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AuthModalProvider } from "./contexts/AuthModalContext";
import { BugReportProvider } from "./contexts/BugReportContext";
import HomePage from "./pages/HomePage";
import ReaderPage from "./pages/ReaderPage";
import RapidRecallPage from "./pages/RapidRecallPage";
import KeywordScanningPage from "./pages/KeywordScanningPage";
import AdminPage from "./pages/AdminPage";

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
          <AuthProvider>
          <AuthModalProvider>
            <BugReportProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/configure" element={<ConfigureRedirect />} />
              <Route path="/reader" element={<ReaderPage />} />
              <Route path="/train/rapid-recall" element={<RapidRecallPage />} />
              <Route path="/train/keyword-scanning" element={<KeywordScanningPage />} />
              <Route path="/dashboard" element={<Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">Loading…</div>}><Dashboard /></Suspense>} />
              <Route path="/admin" element={<AdminPage />} />
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
