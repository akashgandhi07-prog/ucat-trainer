import { Link } from "react-router-dom";
import SEOHead from "../components/seo/SEOHead";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/ucat-verbal-reasoning-practice", label: "Verbal Reasoning" },
  { to: "/ucat-decision-making-practice", label: "Decision Making" },
  { to: "/ucat-quantitative-reasoning-practice", label: "Quantitative Reasoning" },
  { to: "/ucat-sjt-practice", label: "Situational Judgement" },
  { to: "/study-plan", label: "Study plan" },
];

/**
 * Catch-all for unknown URLs. Vercel serves the app shell with a 200 for any path, so
 * without this the page rendered blank and search engines saw a soft 404.
 */
export default function NotFoundPage() {
  return (
    <div className="flex-1 px-4 py-16 sm:px-6">
      <SEOHead
        title="Page not found"
        description="This page does not exist. Choose a UCAT trainer or head back to the home page."
        noindex
      />
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Page not found</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">We could not find that page</h1>
        <p className="mt-3 text-muted-foreground">
          The link may be out of date or mistyped. Pick up your practice from one of these instead.
        </p>
        <nav aria-label="Popular pages" className="mt-8 flex flex-wrap justify-center gap-3">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
