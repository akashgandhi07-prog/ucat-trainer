import { useNavigate } from "react-router-dom";
import { Scale, Zap, LayoutList } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsSectionLayout, { SkillsSectionBlock } from "../components/layout/SkillsSectionLayout";
import HubTrainerCard from "../components/layout/HubTrainerCard";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";

export default function DecisionMakingPage() {
  const navigate = useNavigate();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-decision-making-practice` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt =
    "UCAT Decision Making hub with cards linking to syllogism micro and macro drills";
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/ucat-decision-making-practice` },
      ]
    : undefined;

  return (
    <>
      <SEOHead
        title="UCAT Decision Making skills practice"
        description="Free UCAT Decision Making drills for UK applicants: syllogism micro and macro practice from TheUKCATPeople. Build speed and accuracy for the test."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <SkillsSectionLayout
        title="Decision Making"
        description="Train logical reasoning and syllogisms for the UCAT."
        icon={Scale}
        accent="amber"
        breadcrumbs={breadcrumbs}
      >
        <SkillsSectionBlock
          title="Syllogisms Trainer"
          description="Decide whether conclusions follow from given premises. Use micro drills for speed and pattern recognition, or macro drills for full UCAT-style stimulus with five conclusions."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            <HubTrainerCard
              title="Micro Drill"
              description="One premise, one conclusion. Build instant pattern recognition with keyboard shortcuts."
              icon={Zap}
              accent="amber"
              onClick={() => navigate("/train/syllogism/micro")}
            />
            <HubTrainerCard
              title="Macro Drill"
              description="Full stimulus with five conclusions. UCAT-style layout with sticky passage and Yes/No for each."
              icon={LayoutList}
              accent="amber"
              onClick={() => navigate("/train/syllogism/macro")}
            />
          </div>
        </SkillsSectionBlock>
        <UcatGuidesPanel embedded context="decisionHub" />
        <TrainerFaqSection
          embedded
          id="decision-making-faq"
          title="Common questions about the UCAT Decision Making skills trainers"
          intro="Answers to common questions about UCAT Decision Making, with a particular focus on using syllogism micro and macro drills to build reliable logical reasoning."
          faqs={trainerFaqs.decisionHub}
        />
      </SkillsSectionLayout>
      <Footer />
    </>
  );
}
