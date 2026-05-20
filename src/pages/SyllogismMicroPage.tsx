import { useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import MicroDrill from "../components/syllogisms/MicroDrill";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { ArrowLeft } from "lucide-react";
import { trackEvent } from "../lib/analytics";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { useAppShell } from "../contexts/AppShellContext";
import { APP_CONTENT_X } from "../lib/appContentLayout";
import { cn } from "../lib/cn";

export default function SyllogismMicroPage() {
  const inAppShell = useAppShell();

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
    <div className="flex flex-col min-h-screen bg-secondary">
      <SEOHead
        title="UCAT syllogism micro drill (Decision Making)"
        description="Fast syllogism practice for UCAT Decision Making: one premise, one conclusion. Build pattern recognition for the UK UCAT."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className={cn("pt-4 pb-2", inAppShell ? APP_CONTENT_X : "px-4")}>
          <div className={cn("w-full", !inAppShell && "max-w-3xl mx-auto")}>
            <Link
              to="/decision-making"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Decision Making
            </Link>
          </div>
        </div>
        <MicroDrill />
      </div>
      <div className={cn(inAppShell ? APP_CONTENT_X : undefined, "pb-8 sm:pb-10")}>
        <UcatGuidesPanel
          embedded={inAppShell}
          context="decisionHub"
          contentMaxWidthClass={inAppShell ? "w-full" : "max-w-6xl mx-auto w-full"}
        />
      </div>
      <Footer />
    </div>
  );
}
