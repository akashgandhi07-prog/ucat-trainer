import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import MacroDrill from "../components/syllogisms/MacroDrill";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { ArrowLeft } from "lucide-react";
import { trackEvent } from "../lib/analytics";

export default function SyllogismMacroPage() {
  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: "syllogism",
      mode: "macro",
      pathname: "/train/syllogism/macro",
    });
  }, []);
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-syllogism-practice-macro-drills` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/ucat-decision-making-practice` },
        { name: "Syllogism Macro", url: `${base}/ucat-syllogism-practice-macro-drills` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <SEOHead
        title="Syllogism Macro Drill | UCAT Decision Making"
        description="UCAT-style syllogism drill: full stimulus with five conclusions. Sticky passage and Yes/No judgements."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <div className="max-w-6xl mx-auto flex flex-col gap-2">
            <BreadcrumbNav items={breadcrumbs} />
            <Link
              to="/ucat-decision-making-practice"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Decision Making hub
            </Link>
          </div>
        </div>
        <MacroDrill />
      </div>
      <TrainerFaqSection
        id="syllogism-macro-faq"
        title="UCAT syllogism macro drill FAQs"
        intro="Frequently asked questions about long-form UCAT syllogism questions and how to use this macro drill to build Decision Making marks."
        faqs={trainerFaqs.syllogismMacro}
      />
      <Footer />
    </div>
  );
}
