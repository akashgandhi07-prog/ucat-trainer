import { Calculator, Brain, Ruler, ListChecks, Table2, Gauge } from "lucide-react";
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
        schemaType="CollectionPage"
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
          <HubTrainerGrid trainerCount={6}>
            <HubTrainerCard
              title="QR Setup Trainer"
              description="Translate a situation into the right data, operation, unit and calculator entry."
              icon={ListChecks}
              accent="emerald"
              eyebrow="Build the method"
              to="/ucat-qr-setup-trainer"
            />
            <HubTrainerCard
              title="Data Extraction Trainer"
              description="Find the correct rows, columns and units in tables before calculating."
              icon={Table2}
              accent="emerald"
              eyebrow="Read data accurately"
              to="/ucat-qr-data-extraction-trainer"
            />
            <HubTrainerCard
              title="Estimation & Elimination"
              description="Choose a reliable range and the fastest shortcut before calculating exactly."
              icon={Gauge}
              accent="emerald"
              eyebrow="Reject bad answers"
              to="/ucat-qr-estimation-trainer"
            />
            <HubTrainerCard
              title="Calculator Trainer"
              description="Master the on-screen calculator and keypad under time pressure."
              icon={Calculator}
              accent="emerald"
              to="/ucat-calculator-trainer"
            />
            <HubTrainerCard
              title="Mental Maths Trainer"
              description="Build speed and estimation without the calculator."
              icon={Brain}
              accent="emerald"
              to="/ucat-mental-maths-trainer"
            />
            <HubTrainerCard
              title="Conversions Trainer"
              description="Practise metric units, time conversions, rates and per-100 setups."
              icon={Ruler}
              accent="emerald"
              to="/ucat-unit-conversions-trainer"
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
