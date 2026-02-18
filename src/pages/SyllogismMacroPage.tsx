import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import MacroDrill from "../components/syllogisms/MacroDrill";
import SEOHead from "../components/seo/SEOHead";
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
  const canonicalUrl = getSiteBaseUrl()
    ? `${getSiteBaseUrl()}/train/syllogism/macro`
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <SEOHead
        title="Syllogism Macro Drill | UCAT Decision Making"
        description="UCAT-style syllogism drill: full stimulus with five conclusions. Sticky passage and Yes/No judgements."
        canonicalUrl={canonicalUrl}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <div className="max-w-6xl mx-auto">
            <Link
              to="/decision-making"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Decision Making
            </Link>
          </div>
        </div>
        <MacroDrill />
      </div>
      <Footer />
    </div>
  );
}
