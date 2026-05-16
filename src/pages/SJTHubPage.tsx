import { useNavigate } from "react-router-dom";
import { Scale, Star, ArrowUpDown, BookOpen, ExternalLink, ChevronRight } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import SEOHead from "../components/seo/SEOHead";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
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
    accent: "emerald",
    tip: "Focus on what a good doctor would do — not what is easiest or most convenient.",
  },
  {
    id: "importance",
    title: "Importance Rater",
    description:
      "Rate each consideration as Very Important, Important, Of Minor Importance, or Not Important at All.",
    icon: Star,
    path: "/ucat-sjt-importance-trainer",
    accent: "blue",
    tip: "Patient safety and professional duty tend to sit at Very Important. Personal feelings rarely do.",
  },
  {
    id: "ranking",
    title: "Ranking Trainer",
    description:
      "Choose the most and least appropriate response from three options. Tests your ability to compare and prioritise.",
    icon: ArrowUpDown,
    path: "/ucat-sjt-ranking-trainer",
    accent: "purple",
    tip: "You only need to identify the best and worst option — the middle option is not scored.",
  },
] as const;

const accentClasses = {
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
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
  const base = getSiteBaseUrl();
  const canonical = base ? `${base}/ucat-sjt-practice` : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEOHead
        title="UCAT SJT practice (UK)"
        description="Free Situational Judgement Test trainers for the UCAT. Practise appropriateness rating, importance rating and ranking questions, all grounded in GMC Good Medical Practice."
        canonicalUrl={canonical}
      />
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="w-full max-w-3xl mx-auto space-y-10">

          {/* Hero */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <Scale className="w-3.5 h-3.5" aria-hidden />
              Situational Judgement Test
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">SJT Skills Trainers</h1>
            <p className="text-slate-600 max-w-xl mx-auto text-sm leading-relaxed">
              The SJT tests your professional values and judgement against the standards expected of
              a doctor or dentist. Every question and rationale here is grounded in{" "}
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
          </div>

          {/* Trainer cards */}
          <div className="space-y-4">
            {TRAINERS.map((trainer) => {
              const colors = accentClasses[trainer.accent];
              const Icon = trainer.icon;
              return (
                <div
                  key={trainer.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2.5 rounded-xl shrink-0", colors.icon)}>
                        <Icon className="w-6 h-6" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-slate-900 mb-1">{trainer.title}</h2>
                        <p className="text-sm text-slate-600 leading-relaxed mb-3">{trainer.description}</p>
                        <div className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium", colors.badge)}>
                          <BookOpen className="w-3 h-3" aria-hidden />
                          {trainer.tip}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(trainer.path)}
                      className={cn(
                        "mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                        colors.btn
                      )}
                    >
                      Start trainer
                      <ChevronRight className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GMC Domains */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              GMC Good Medical Practice — The Four Domains
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Every SJT question maps to one of these four domains. Understanding the principles
              within each domain is more reliable than trying to memorise individual answers.
            </p>
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
          </div>

          {/* How it's scored */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">How SJT scoring works</h2>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-emerald-700 shrink-0">Full marks</span>
                <span>— your rating or selection exactly matches the correct answer.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-amber-600 shrink-0">Partial credit</span>
                <span>— your rating is one step away from the correct answer (e.g. you chose Appropriate when Very Appropriate was correct).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-red-600 shrink-0">No credit</span>
                <span>— your rating is two or more steps from correct, or you chose the wrong most/least option in a ranking question.</span>
              </div>
            </div>
          </div>

        </div>
      </main>
      <UcatGuidesPanel context="sjtHub" />
      <TrainerFaqSection
        id="sjt-faq"
        title="Common questions about the UCAT SJT"
        intro="Frequently asked questions about the Situational Judgement Test — how it works, how it's scored, and how to approach each question type using GMC Good Medical Practice."
        faqs={trainerFaqs.sjtHub}
        collapseIntoSingleAccordion
      />
      <Footer />
    </div>
  );
}
