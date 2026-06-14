import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import MacroDrill from "../components/syllogisms/MacroDrill";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { ArrowLeft } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import { useAppShell } from "../contexts/AppShellContext";
import { APP_CONTENT_X } from "../lib/appContentLayout";
import { cn } from "../lib/cn";

export default function SyllogismMacroPage() {
  const inAppShell = useAppShell();

  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: "syllogism",
      mode: "macro",
      pathname: "/ucat-syllogism-practice-macro-drills",
    });
  }, []);
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-syllogism-practice-macro-drills` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt =
    "UCAT syllogism macro drill interface with full stimulus and five Yes/No conclusions";
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/ucat-decision-making-practice` },
        { name: "Syllogism Macro", url: `${base}/ucat-syllogism-practice-macro-drills` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <SEOHead
        title="UCAT syllogism macro drill (Decision Making)"
        description="Full-passage syllogism practice for UCAT Decision Making: five conclusions, sticky stimulus, Yes/No judgements. UK UCAT style."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className={cn("pt-4 pb-2", inAppShell ? APP_CONTENT_X : "px-4")}>
          <div className={cn("w-full flex flex-col gap-2", !inAppShell && "max-w-6xl mx-auto")}>
            <BreadcrumbNav items={breadcrumbs} />
            <Link
              to="/ucat-decision-making-practice"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Decision Making hub
            </Link>
          </div>
        </div>
        <MacroDrill />
      </div>
      <div className={cn(inAppShell ? APP_CONTENT_X : undefined, "pb-8 sm:pb-10")}>
        <UcatGuidesPanel
          embedded={inAppShell}
          context="decisionHub"
          contentMaxWidthClass={inAppShell ? "w-full" : "max-w-6xl mx-auto w-full"}
        />
      </div>
      <TrainerFaqSection
        id="syllogism-macro-faq"
        title="UCAT syllogism macro drill FAQs"
        intro="Frequently asked questions about long-form UCAT syllogism questions and how to use this macro drill to build Decision Making marks."
        faqs={trainerFaqs.syllogismMacro}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
