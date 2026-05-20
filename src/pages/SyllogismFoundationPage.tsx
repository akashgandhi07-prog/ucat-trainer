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
import { useAppShell } from "../contexts/AppShellContext";
import { APP_CONTENT_X } from "../lib/appContentLayout";
import { cn } from "../lib/cn";

export default function SyllogismFoundationPage() {
  const inAppShell = useAppShell();

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
    <div className="flex flex-col min-h-screen bg-secondary">
      <SEOHead
        title="UCAT syllogism foundations trainer"
        description="Build syllogism fluency with focused Yes/No drills before practising full Decision Making questions."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">
        <div className={cn("pt-4 pb-2", inAppShell ? APP_CONTENT_X : "px-4")}>
          <div className={cn("w-full flex flex-col gap-2", !inAppShell && "max-w-3xl mx-auto")}>
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
        <FoundationDrill />
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
