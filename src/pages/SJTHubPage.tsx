import { useNavigate, useLocation } from "react-router-dom";
import { Scale, Star, ArrowUpDown, ExternalLink, ChevronRight, Users } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SEOHead from "../components/seo/SEOHead";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import SkillsSectionLayout, { SkillsSectionBlock } from "../components/layout/SkillsSectionLayout";
import { GMC_DOMAINS_LIST, GMP_MAIN_URL } from "../data/gmcDomains";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { cn } from "../lib/cn";

const TRAINERS = [
  {
    id: "appropriateness",
    title: "Appropriateness Rater",
    description:
      "Rate each response as Very Appropriate, Appropriate, Inappropriate, or Very Inappropriate. The most common SJT question type.",
    icon: Scale,
    path: "/ucat-sjt-appropriateness-trainer",
    accent: "emerald" as const,
    benefit: "Most common type",
    tip: "Focus on what a good doctor would do — not what is easiest or most convenient.",
  },
  {
    id: "importance",
    title: "Importance Rater",
    description:
      "Rate each consideration as Very Important, Important, Of Minor Importance, or Not Important at All.",
    icon: Star,
    path: "/ucat-sjt-importance-trainer",
    accent: "blue" as const,
    benefit: "Partial credit scoring",
    tip: "Patient safety and professional duty tend to sit at Very Important. Personal feelings rarely do.",
  },
  {
    id: "ranking",
    title: "Ranking Trainer",
    description:
      "Choose the most and least appropriate response from three options. Tests your ability to compare and prioritise.",
    icon: ArrowUpDown,
    path: "/ucat-sjt-ranking-trainer",
    accent: "purple" as const,
    benefit: "Best vs worst",
    tip: "You only need to identify the best and worst option — the middle option is not scored.",
  },
] as const;

const trainerAccent: Record<string, { icon: string; btn: string }> = {
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-600",
    btn: "bg-purple-600 hover:bg-purple-700 text-white",
  },
};

const domainColors: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-700 border-blue-200",
  emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  amber: "bg-amber-500/10 text-amber-700 border-amber-200",
  purple: "bg-purple-500/10 text-purple-700 border-purple-200",
};

export default function SJTHubPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = getSiteBaseUrl();
  const canonical = base ? `${base}/ucat-sjt-practice` : undefined;
  const breadcrumbs =
    base
      ? [
          { name: "Home", url: `${base}/` },
          { name: "Situational Judgement", url: `${base}/ucat-sjt-practice` },
        ]
      : undefined;

  return (
    <>
      <SEOHead
        title="UCAT SJT practice (UK)"
        description="Free Situational Judgement Test trainers for the UCAT. Practise appropriateness rating, importance rating and ranking questions, all grounded in GMC Good Medical Practice."
        canonicalUrl={canonical}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <div className="pb-24 sm:pb-0">
        <SkillsSectionLayout
          wide
          title="Situational Judgement"
          description="The SJT tests your professional values and judgement against the standards expected of a doctor or dentist. Every question and rationale here is grounded in GMC Good Medical Practice."
          icon={Users}
          accent="purple"
          breadcrumbs={breadcrumbs}
        >
          <div className="space-y-8 sm:space-y-10">

            <SkillsSectionBlock title="Pick a trainer">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-3 text-left">
                {TRAINERS.map(({ id, title, description, icon: Icon, path, accent, benefit, tip }) => {
                  const colors = trainerAccent[accent];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => navigate(path)}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:border-primary/40 hover:shadow-md p-4 sm:p-5 text-left transition-all duration-200"
                    >
                      <div className="flex flex-col gap-1 sm:gap-2 mb-3">
                        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0", colors.icon)}>
                          <Icon className="w-5 h-5" aria-hidden />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {benefit}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-foreground">{title}</p>
                      <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted-foreground flex-1">
                        {description}
                      </p>
                      <div className="mt-4 rounded-lg bg-muted/50 border border-border px-3 py-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                      </div>
                      <div className={cn("mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors", colors.btn)}>
                        Start trainer
                        <ChevronRight className="w-4 h-4" aria-hidden />
                      </div>
                    </button>
                  );
                })}
              </div>
            </SkillsSectionBlock>

            <SkillsSectionBlock
              title="GMC Good Medical Practice — The Four Domains"
              description="Every SJT question maps to one of these four domains. Understanding the principles within each domain is more reliable than trying to memorise individual answers."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GMC_DOMAINS_LIST.map((domain) => (
                  <a
                    key={domain.id}
                    href={domain.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "rounded-xl border p-4 hover:shadow-sm transition-shadow group",
                      domainColors[domain.color]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold leading-snug">{domain.name}</p>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden />
                    </div>
                    <p className="text-xs leading-relaxed opacity-80">{domain.description}</p>
                  </a>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Questions are grounded in{" "}
                <a
                  href={GMP_MAIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  GMC Good Medical Practice
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </a>
                .
              </p>
            </SkillsSectionBlock>

            <SkillsSectionBlock title="How SJT scoring works">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                {[
                  { label: "Full marks", color: "text-emerald-700", desc: "your rating or selection exactly matches the correct answer." },
                  { label: "Partial credit", color: "text-amber-600", desc: "your rating is one step away from the correct answer (e.g. you chose Appropriate when Very Appropriate was correct)." },
                  { label: "No credit", color: "text-red-600", desc: "your rating is two or more steps from correct, or you chose the wrong most/least option in a ranking question." },
                ].map(({ label, color, desc }) => (
                  <div key={label} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className={cn("font-semibold shrink-0", color)}>{label}</span>
                    <span>— {desc}</span>
                  </div>
                ))}
              </div>
            </SkillsSectionBlock>

          </div>
        </SkillsSectionLayout>
        <UcatGuidesPanel embedded context="sjtHub" />
        <TrainerFaqSection
          embedded
          id="sjt-faq"
          title="Common questions about the UCAT SJT"
          intro="Frequently asked questions about the Situational Judgement Test — how it works, how it's scored, and how to approach each question type using GMC Good Medical Practice."
          faqs={trainerFaqs.sjtHub}
          collapseIntoSingleAccordion
        />
      </div>
      <Footer />
    </>
  );
}
