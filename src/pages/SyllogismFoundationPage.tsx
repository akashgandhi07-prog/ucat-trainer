import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import FoundationDrill from "../components/syllogisms/FoundationDrill";
import SEOHead from "../components/seo/SEOHead";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { trackEvent } from "../lib/analytics";

export default function SyllogismFoundationPage() {
  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: "syllogism",
      mode: "foundation",
      pathname: "/ucat-syllogism-foundations-trainer",
    });
  }, []);

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-syllogism-foundations-trainer` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/ucat-decision-making-practice` },
        { name: "Syllogism Foundations", url: `${base}/ucat-syllogism-foundations-trainer` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <SEOHead
        title="UCAT syllogism foundations trainer"
        description="Learn the core UCAT syllogism rules with focused Yes/No drills before practising full Decision Making questions."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
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
        <FoundationDrill />
        <div className="max-w-3xl mx-auto px-4 pb-6">
          <UcatGuidesPanel
            context="decisionHub"
            className="mt-0"
            contentMaxWidthClass="max-w-3xl mx-auto w-full"
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
