import { Link } from "react-router-dom";
import { useBugReportModal } from "../../contexts/BugReportContext";

export default function Footer() {
  const { openBugReport } = useBugReportModal();
  return (
    <footer className="border-t border-slate-200 bg-white/60 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex justify-center items-center gap-2 sm:gap-6 text-sm text-slate-600 mb-3 flex-wrap">
          <Link to="/" className="hover:text-blue-600 transition-colors min-h-[44px] inline-flex items-center justify-center py-2 px-2">
            Home
          </Link>
          <Link to="/dashboard" className="hover:text-blue-600 transition-colors min-h-[44px] inline-flex items-center justify-center py-2 px-2">
            Dashboard
          </Link>
          <button
            type="button"
            onClick={openBugReport}
            className="text-slate-600 hover:text-blue-600 transition-colors min-h-[44px] inline-flex items-center justify-center py-2 px-2"
          >
            Feedback
          </button>
        </nav>
        <p className="text-center text-sm text-slate-500">
          © 2026 TheUKCATPeople. Secure & Encrypted.
        </p>
      </div>
    </footer>
  );
}
