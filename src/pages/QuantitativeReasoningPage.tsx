import { useNavigate } from "react-router-dom";
import { Calculator, Brain } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsSectionLayout, { SkillsSectionBlock } from "../components/layout/SkillsSectionLayout";
import HubTrainerCard from "../components/layout/HubTrainerCard";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";

export default function QuantitativeReasoningPage() {
  const navigate = useNavigate();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-quantitative-reasoning-practice` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt =
    "UCAT Quantitative Reasoning hub highlighting calculator and mental maths trainers";
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Quantitative Reasoning", url: `${base}/ucat-quantitative-reasoning-practice` },
      ]
    : undefined;

  return (
    <>
      <SEOHead
        title="Quantitative Reasoning UCAT practice (UK)"
        description="Free calculator and mental maths practice for UCAT Quantitative Reasoning in the UK. Train the on-screen calculator and build mental speed with TheUKCATPeople."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <SkillsSectionLayout
        title="Quantitative Reasoning"
        description="Choose a trainer to build calculator fluency or mental maths speed."
        icon={Calculator}
        accent="emerald"
        breadcrumbs={breadcrumbs}
      >
        <SkillsSectionBlock title="Trainers">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
            <HubTrainerCard
              title="Calculator Trainer"
              description="Master the on-screen calculator and keypad under time pressure."
              icon={Calculator}
              accent="emerald"
              onClick={() => navigate("/train/calculator")}
            />
            <HubTrainerCard
              title="Mental Maths Trainer"
              description="Build speed and estimation without the calculator."
              icon={Brain}
              accent="violet"
              onClick={() => navigate("/train/mentalMaths")}
            />
          </div>
        </SkillsSectionBlock>
        <UcatGuidesPanel embedded context="quantHub" />
        <TrainerFaqSection
          embedded
          id="quant-faq"
          title="UCAT Quantitative Reasoning hub FAQs"
          intro="Guidance on using the Quantitative Reasoning hub, calculator trainer and mental maths practice to raise your UCAT QR score."
          faqs={trainerFaqs.quantHub}
        />
      </SkillsSectionLayout>
      <Footer />
    </>
  );
}
