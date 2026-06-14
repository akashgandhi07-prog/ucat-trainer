import { useNavigate } from "react-router-dom";
import { Calculator, Brain, Ruler } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsSectionLayout, {
  HubTrainerGrid,
  SkillsSectionBlock,
} from "../components/layout/SkillsSectionLayout";
import HubTrainerCard from "../components/layout/HubTrainerCard";
import { HUB_SKILLS_TRAINERS_TITLE } from "../components/layout/hubTrainerLayout";
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
        description="Choose a trainer to build calculator fluency, mental maths speed, or unit conversion accuracy."
        icon={Calculator}
        accent="emerald"
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-8 sm:space-y-10">
        <SkillsSectionBlock title={HUB_SKILLS_TRAINERS_TITLE}>
          <HubTrainerGrid trainerCount={3}>
            <HubTrainerCard
              title="Calculator Trainer"
              description="Master the on-screen calculator and keypad under time pressure."
              icon={Calculator}
              accent="emerald"
              onClick={() => navigate("/ucat-calculator-trainer")}
            />
            <HubTrainerCard
              title="Mental Maths Trainer"
              description="Build speed and estimation without the calculator."
              icon={Brain}
              accent="emerald"
              onClick={() => navigate("/ucat-mental-maths-trainer")}
            />
            <HubTrainerCard
              title="Conversions Trainer"
              description="Practise metric units, time conversions, rates and per-100 setups."
              icon={Ruler}
              accent="emerald"
              onClick={() => navigate("/ucat-unit-conversions-trainer")}
            />
          </HubTrainerGrid>
        </SkillsSectionBlock>
        <UcatGuidesPanel embedded context="quantHub" />
        <TrainerFaqSection
          embedded
          id="quant-faq"
          title="UCAT Quantitative Reasoning hub FAQs"
          intro="Guidance on using the Quantitative Reasoning hub, calculator trainer and mental maths practice to raise your UCAT QR score."
          faqs={trainerFaqs.quantHub}
        />
        </div>
      </SkillsSectionLayout>
      <Footer />
    </>
  );
}
