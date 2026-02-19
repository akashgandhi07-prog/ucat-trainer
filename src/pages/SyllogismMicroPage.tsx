import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import MicroDrill from "../components/syllogisms/MicroDrill";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { ArrowLeft } from "lucide-react";
import { trackEvent } from "../lib/analytics";

export default function SyllogismMicroPage() {
  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: "syllogism",
      mode: "micro",
      pathname: "/train/syllogism/micro",
    });
  }, []);
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/train/syllogism/micro` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/decision-making` },
        { name: "Syllogism Micro", url: `${base}/train/syllogism/micro` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <SEOHead
        title="Syllogism Micro Drill | UCAT Decision Making"
        description="Rapid syllogism drill: one premise, one conclusion. Build pattern recognition for UCAT Decision Making."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <Link
              to="/decision-making"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Decision Making
            </Link>
          </div>
        </div>
        <MicroDrill />
      </div>
      <Footer />
    </div>
  );
}
