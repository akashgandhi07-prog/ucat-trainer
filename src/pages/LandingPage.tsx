import { Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAppShell } from "../contexts/AppShellContext";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SEOHead from "../components/seo/SEOHead";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { TRUSTPILOT_STATS } from "../lib/trustpilotSocialProof";
import {
  LandingHero,
  LandingSectionHub,
} from "../components/landing/HomeLandingSections";

// Everything below the fold (how-it-works, drill catalogue, planning, paid
// support, reviews, credibility, guides and the FAQ + FAQPage JSON-LD) is code
// split into its own chunk so the heavy data/copy it imports (trainerFaqs,
// ProductUpsell copy, guides) leaves the eager main bundle. It renders on mount
// inside Suspense with a minimal reserved-height fallback so layout does not jump.
const HomeBelowFold = lazyWithRetry(
  () => import("../components/landing/HomeBelowFold"),
  "HomeBelowFold",
);

export default function HomePage() {
  const navigate = useNavigate();
  const inAppShell = useAppShell();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const breadcrumbs = base ? [{ name: "Home", url: `${base}/` }] : undefined;
  const ogImageAlt =
    "Free UCAT Skills Trainer for Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement practice";

  return (
    <div
      className={`flex flex-col bg-background font-sans ${inAppShell ? "flex-1 min-h-0 overflow-y-auto" : "min-h-screen"}`}
    >
      <SEOHead
        title="Free UCAT Practice Trainer (UK)"
        description="Free UCAT practice for UK applicants: free questions, skill drills, study planning and mock score tracking from TheUKCATPeople. Verbal Reasoning, Decision Making and Quantitative Reasoning. Rated 5.0 on Trustpilot."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
        aggregateRating={{
          ratingValue: TRUSTPILOT_STATS.score,
          reviewCount: String(TRUSTPILOT_STATS.reviewCount),
        }}
      />
      {!inAppShell ? <Header /> : null}
      <main className="flex-1 flex flex-col">
        <LandingHero />
        <LandingSectionHub
          onVerbal={() => navigate("/ucat-verbal-reasoning-practice")}
          onDecision={() => navigate("/ucat-decision-making-practice")}
          onQuant={() => navigate("/ucat-quantitative-reasoning-practice")}
          onSjt={() => navigate("/ucat-sjt-practice")}
        />
        <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
          <HomeBelowFold />
        </Suspense>
      </main>
      {!inAppShell ? <Footer /> : null}
    </div>
  );
}
