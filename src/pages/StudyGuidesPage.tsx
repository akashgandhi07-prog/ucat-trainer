import { Library } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsSectionLayout from "../components/layout/SkillsSectionLayout";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";

export default function StudyGuidesPage() {
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/study-guides` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Study guides", url: `${base}/study-guides` },
      ]
    : undefined;

  return (
    <>
      <SEOHead
        title="UCAT study guides · free library"
        description="Free UCAT guides for UK applicants: essentials, Verbal Reasoning, Decision Making, Quantitative Reasoning, SJT and application. Same library as our skill hubs."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt="UCAT study guides library"
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <SkillsSectionLayout
        wide
        title="Study guides"
        description="Open a section below to see all links from our guide library (same accordion as on the hubs). Guides open on The UKCAT People in a new tab."
        icon={Library}
        accent="primary"
        breadcrumbs={breadcrumbs}
      >
        <UcatGuidesPanel embedded context="studyGuides" />
      </SkillsSectionLayout>
      <Footer />
    </>
  );
}
