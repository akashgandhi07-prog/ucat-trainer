import { useNavigate } from "react-router-dom";
import { isPlannerIntegrated } from "../lib/plannerUrl";
import { useAppShell } from "../contexts/AppShellContext";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { TRUSTPILOT_STATS } from "../lib/trustpilotSocialProof";
import {
  LandingCredibility,
  LandingDrillCatalog,
  LandingHero,
  LandingHowItWorks,
  LandingPaidSupport,
  LandingPlanning,
  LandingReviews,
  LandingSectionHub,
} from "../components/landing/HomeLandingSections";

export default function HomePage() {
  const navigate = useNavigate();
  const plannerOn = isPlannerIntegrated();
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
        title="Free UCAT skills trainer (UK)"
        description="Free UCAT skills trainer for UK applicants: drills, study plan and mock tracking from TheUKCATPeople. Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement. Rated 5.0 on Trustpilot."
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
          onVerbal={() => navigate("/verbal")}
          onDecision={() => navigate("/decision-making")}
          onQuant={() => navigate("/quantitative")}
          onSjt={() => navigate("/ucat-sjt-practice")}
        />
        <LandingHowItWorks />
        <LandingDrillCatalog />
        <LandingPlanning plannerOn={plannerOn} />
        <LandingPaidSupport />
        <LandingReviews />
        <LandingCredibility />
        <section className="py-10 sm:py-12 border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <UcatGuidesPanel embedded context="home" />
          </div>
        </section>
        <TrainerFaqSection
          id="home-faq"
          title="Common questions about this UCAT trainer"
          intro="Answers to common questions about how to use this free UCAT practice platform alongside your main question bank and the official resources."
          faqs={trainerFaqs.home}
        />
      </main>
      {!inAppShell ? <Footer /> : null}
    </div>
  );
}
