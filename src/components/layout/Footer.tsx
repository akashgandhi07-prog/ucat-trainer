import { Link } from "react-router-dom";
import { useBugReportModal } from "../../contexts/BugReportContext";
import { useAppShell } from "../../contexts/AppShellContext";
import { PACKAGE_LINKS, STRATEGY_CALL_URL, getNextCourseUrl } from "../../lib/productUpsell";
import TutoringUpsell from "./TutoringUpsell";

const externalLinkProps = { target: "_blank" as const, rel: "noopener noreferrer" };

export default function Footer() {
  const { openBugReport } = useBugReportModal();
  const inAppShell = useAppShell();
  if (inAppShell) return null;
  return (
    <footer className="border-t border-border bg-white/60 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex justify-center items-center gap-2 sm:gap-6 text-sm text-muted-foreground mb-3 flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors min-h-[44px] inline-flex items-center justify-center py-2 px-2">
            Home
          </Link>
          <Link to="/dashboard" className="hover:text-primary transition-colors min-h-[44px] inline-flex items-center justify-center py-2 px-2">
            Dashboard
          </Link>
          <button
            type="button"
            onClick={openBugReport}
            className="text-muted-foreground hover:text-primary transition-colors min-h-[44px] inline-flex items-center justify-center py-2 px-2"
          >
            Feedback
          </button>
        </nav>
        <div className="flex justify-center mb-4">
          <a
            href={STRATEGY_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            📞 Book a free strategy call
          </a>
        </div>
        <nav className="flex justify-center items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3 flex-wrap" aria-label="Application support">
          {getNextCourseUrl() ? (
            <a href={getNextCourseUrl()!} className="hover:text-foreground transition-colors font-medium" {...externalLinkProps}>
              UCAT 1-day courses
            </a>
          ) : null}
          {PACKAGE_LINKS.map(({ label, href }) => (
            <a key={href} href={href} className="hover:text-foreground transition-colors" {...externalLinkProps}>
              {label}
            </a>
          ))}
        </nav>
        <TutoringUpsell variant="footer" />
        <p className="text-center text-sm text-muted-foreground">
          © 2026 TheUKCATPeople. Secure & Encrypted.
        </p>
      </div>
    </footer>
  );
}
