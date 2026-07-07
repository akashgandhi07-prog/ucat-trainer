import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SEOHead from "../components/seo/SEOHead";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import DmSkillsTrainerSession from "../components/dmTrainers/DmSkillsTrainerSession";
import { getDmTrainerConfig } from "../data/dmTrainers/trainerConfig";
import type { DmTrainerType } from "../types/dmTrainers";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { useAppShell } from "../contexts/AppShellContext";
import { APP_CONTENT_X } from "../lib/appContentLayout";
import { scrollPageToTop } from "../lib/scrollPageToTop";
import { cn } from "../lib/cn";

type Props = {
  trainerType: DmTrainerType;
};

export default function DmTrainerPage({ trainerType }: Props) {
  const config = getDmTrainerConfig(trainerType);
  const inAppShell = useAppShell();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}${config.canonicalPath}` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt = `UCAT Decision Making ${config.title} trainer interface showing practice questions`;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/ucat-decision-making-practice` },
        { name: config.title, url: `${base}${config.canonicalPath}` },
      ]
    : undefined;

  useEffect(() => {
    scrollPageToTop({ behavior: "instant" });
  }, [trainerType]);

  const content = (
    <>
      <div className={cn("pt-4 pb-2", inAppShell ? APP_CONTENT_X : "px-4")}>
        <Link
          to="/ucat-decision-making-practice"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to Decision Making
        </Link>
      </div>
      <DmSkillsTrainerSession trainerType={trainerType} />
      <div className={cn(inAppShell ? APP_CONTENT_X : undefined, "pb-8 sm:pb-10")}>
        <UcatGuidesPanel
          embedded={inAppShell}
          context="decisionHub"
          contentMaxWidthClass={inAppShell ? "w-full" : "max-w-6xl mx-auto w-full"}
          className={inAppShell ? "mt-6 sm:mt-8" : undefined}
        />
      </div>
    </>
  );

  if (inAppShell) {
    return (
      <>
        <SEOHead
          title={config.seoTitle}
          description={config.seoDescription}
          canonicalUrl={canonicalUrl}
          imageUrl={ogImageUrl}
          imageAlt={ogImageAlt}
          breadcrumbs={breadcrumbs}
        />
        <div className="w-full min-h-0 bg-secondary">{content}</div>
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <SEOHead
        title={config.seoTitle}
        description={config.seoDescription}
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="flex-1 flex flex-col">{content}</div>
      <Footer />
    </div>
  );
}
