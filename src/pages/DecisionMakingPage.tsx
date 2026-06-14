import { useNavigate } from "react-router-dom";
import { Scale, Zap, LayoutList, Circle, BarChart3, GraduationCap } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SkillsSectionLayout, {
  HubTrainerGrid,
  SkillsSectionBlock,
} from "../components/layout/SkillsSectionLayout";
import { HUB_SKILLS_TRAINERS_TITLE } from "../components/layout/hubTrainerLayout";
import HubTrainerCard from "../components/layout/HubTrainerCard";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { DM_TRAINER_CONFIGS } from "../data/dmTrainers/trainerConfig";

export default function DecisionMakingPage() {
  const navigate = useNavigate();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-decision-making-practice` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const ogImageAlt =
    "UCAT Decision Making hub with syllogism drills and Venn, data and argument skills trainers";
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/ucat-decision-making-practice` },
      ]
    : undefined;

  const venn = DM_TRAINER_CONFIGS["venn-logic"];
  const data = DM_TRAINER_CONFIGS["data-logic"];
  const argument = DM_TRAINER_CONFIGS["argument-judge"];

  return (
    <>
      <SEOHead
        title="UCAT Decision Making skills practice"
        description="Free UCAT Decision Making practice for UK applicants: syllogisms, Venn diagram questions, data and probability logic, and strongest argument drills from The UKCAT People."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt={ogImageAlt}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <SkillsSectionLayout
        title="Decision Making"
        description="Train syllogisms, set logic, data reasoning and argument judgement for the UCAT."
        icon={Scale}
        accent="amber"
        breadcrumbs={breadcrumbs}
      >
        <div className="space-y-8 sm:space-y-10">
        <SkillsSectionBlock
          title={HUB_SKILLS_TRAINERS_TITLE}
          description="Syllogism drills plus targeted practice for Venn logic, data reasoning and argument judgement. Each trainer isolates one repeatable UCAT pattern."
        >
          <HubTrainerGrid trainerCount={6}>
            <HubTrainerCard
              title="Syllogisms · Foundations"
              description="Quick Yes/No drills on premise and conclusion pairs before timed practice."
              icon={GraduationCap}
              accent="amber"
              onClick={() => navigate("/ucat-syllogism-foundations-trainer")}
            />
            <HubTrainerCard
              title="Syllogisms · Micro"
              description="One premise, one conclusion. Build instant pattern recognition with keyboard shortcuts."
              icon={Zap}
              accent="amber"
              onClick={() => navigate("/ucat-syllogism-practice-micro-drills")}
            />
            <HubTrainerCard
              title="Syllogisms · Macro"
              description="Full stimulus with five conclusions. UCAT-style layout with sticky passage and Yes/No for each."
              icon={LayoutList}
              accent="amber"
              onClick={() => navigate("/train/syllogism/macro")}
            />
            <HubTrainerCard
              title={venn.title}
              description={venn.hubDescription}
              icon={Circle}
              accent="amber"
              onClick={() => navigate(venn.canonicalPath)}
            />
            <HubTrainerCard
              title={data.title}
              description={data.hubDescription}
              icon={BarChart3}
              accent="amber"
              onClick={() => navigate(data.canonicalPath)}
            />
            <HubTrainerCard
              title={argument.title}
              description={argument.hubDescription}
              icon={Scale}
              accent="amber"
              onClick={() => navigate(argument.canonicalPath)}
            />
          </HubTrainerGrid>
        </SkillsSectionBlock>

        <UcatGuidesPanel embedded context="decisionHub" />
        <TrainerFaqSection
          embedded
          id="decision-making-faq"
          title="Common questions about the UCAT Decision Making skills trainers"
          intro="Answers to common questions about UCAT Decision Making, including syllogism drills and skills trainers for Venn logic, data logic and argument judgement."
          faqs={trainerFaqs.decisionHub}
        />
        </div>
      </SkillsSectionLayout>
      <Footer />
    </>
  );
}
