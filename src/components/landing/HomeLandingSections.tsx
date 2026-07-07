import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  Scale,
  Users,
} from "lucide-react";
import { STRATEGY_CALL_URL, TRUSTPILOT_URL } from "../../lib/productUpsell";
import { TRUSTPILOT_STATS } from "../../lib/trustpilotSocialProof";
import { LANDING_TRAINER_COUNT } from "../../data/landingTrainers";
import { cn } from "../../lib/cn";
import { LandingContainer, TrustStars } from "./landingPrimitives";

const EXTERNAL = { target: "_blank" as const, rel: "noopener noreferrer" };

const HERO_CARD_BASE =
  "bg-card border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-hover";

const HERO_SECTIONS = [
  {
    icon: BookOpen,
    label: "Verbal Reasoning",
    count: "4 drills",
    accent: cn(HERO_CARD_BASE, "hover:border-subject-vr/40"),
    iconBg: "bg-subject-vr/10",
    iconColor: "text-subject-vr",
    href: "/ucat-verbal-reasoning-practice",
  },
  {
    icon: Scale,
    label: "Decision Making",
    count: "5 drills",
    accent: cn(HERO_CARD_BASE, "hover:border-subject-dm/40"),
    iconBg: "bg-subject-dm/10",
    iconColor: "text-subject-dm",
    href: "/ucat-decision-making-practice",
  },
  {
    icon: Calculator,
    label: "Quantitative Reasoning",
    count: "3 drills",
    accent: cn(HERO_CARD_BASE, "hover:border-subject-qr/40"),
    iconBg: "bg-subject-qr/10",
    iconColor: "text-subject-qr",
    href: "/ucat-quantitative-reasoning-practice",
  },
  {
    icon: Users,
    label: "Situational Judgement",
    count: "3 drills",
    accent: cn(HERO_CARD_BASE, "hover:border-subject-sjt/40"),
    iconBg: "bg-subject-sjt/10",
    iconColor: "text-subject-sjt",
    href: "/ucat-sjt-practice",
  },
] as const;

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Top colour wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/6 to-transparent" />

      <LandingContainer className="relative py-12 sm:py-18 lg:py-20">
        <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] gap-10 lg:gap-16 items-center">

          {/* ── Left: headline + CTAs ── */}
          <div>
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 mb-6">
              <TrustStars className="text-amber-500" />
              {TRUSTPILOT_STATS.score} on Trustpilot · 14+ years teaching UCAT
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-foreground leading-[1.08]">
              The fastest &amp;{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">free</span>
                <span
                  className="absolute -inset-x-1 -inset-y-0.5 z-0 rounded-md bg-primary/10"
                  aria-hidden
                />
              </span>{" "}
              way to <span className="text-primary">raise your UCAT score.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[520px]">
              {LANDING_TRAINER_COUNT} targeted skill drills: Verbal Reasoning, Decision Making,
              Quantitative Reasoning and Situational Judgement. Open any drill instantly,
              no account needed.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#all-trainers"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Pick a drill, it&apos;s free
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href={STRATEGY_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-foreground/20 bg-card px-7 py-3.5 text-sm font-bold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
              >
                Book a free strategy call
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No card required · Progress saves automatically when you sign in
            </p>

            {/* Stats row */}
            <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-x-7 gap-y-2.5">
              {[
                { value: "10,000+", label: "students helped" },
                { value: String(LANDING_TRAINER_COUNT), label: "free drills" },
                { value: "14+", label: "years teaching UCAT" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <span className="text-xl font-extrabold text-foreground">{value}</span>
                  <span className="ml-1.5 text-sm text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: 2×2 section cards ── */}
          <div className="grid grid-cols-2 gap-3">
            {HERO_SECTIONS.map(({ icon: Icon, label, count, accent, iconBg, iconColor, href }) => (
              <Link
                key={label}
                to={href}
                className={cn(
                  "group flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 transition-all duration-200",
                  accent,
                )}
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBg)}>
                  <Icon className={cn("h-5 w-5", iconColor)} aria-hidden />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground leading-snug">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{count}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Open hub
                  <ArrowRight className="h-3 w-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" aria-hidden />
                </span>
              </Link>
            ))}
          </div>

        </div>
      </LandingContainer>
    </section>
  );
}

export function LandingTrustStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground",
        className,
      )}
      role="list"
      aria-label="Platform highlights"
    >
      <span className="inline-flex items-center gap-2" role="listitem">
        <TrustStars />
        <span>
          <span className="font-semibold text-foreground">{TRUSTPILOT_STATS.score}</span>
          {" · "}
          <a href={TRUSTPILOT_URL} className="underline underline-offset-2 hover:text-primary" {...EXTERNAL}>
            {TRUSTPILOT_STATS.label}
          </a>
        </span>
      </span>
      <span className="hidden sm:inline text-border" aria-hidden>
        |
      </span>
      <span role="listitem">
        <span className="font-semibold text-foreground">{LANDING_TRAINER_COUNT}</span> skill trainers
      </span>
      <span className="hidden sm:inline text-border" aria-hidden>
        |
      </span>
      <span role="listitem">14+ years teaching UCAT</span>
      <span className="hidden sm:inline text-border" aria-hidden>
        |
      </span>
      <span role="listitem">No card to start drilling</span>
    </div>
  );
}

type SectionHubProps = {
  onVerbal: () => void;
  onDecision: () => void;
  onQuant: () => void;
  onSjt: () => void;
};

export function LandingSectionHub({ onVerbal, onDecision, onQuant, onSjt }: SectionHubProps) {
  const cards = [
    {
      onClick: onVerbal,
      icon: BookOpen,
      accent: "bg-subject-vr/20 text-subject-vr group-hover:bg-subject-vr/30",
      title: "Verbal Reasoning",
      desc: "Speed reading, rapid recall, keyword scanning and inference.",
      label: "4 trainers",
    },
    {
      onClick: onDecision,
      icon: Scale,
      accent: "bg-subject-dm/20 text-subject-dm group-hover:bg-subject-dm/30",
      title: "Decision Making",
      desc: "Syllogisms, Venn logic, data reasoning and argument judgement.",
      label: "5 trainers",
    },
    {
      onClick: onQuant,
      icon: Calculator,
      accent: "bg-subject-qr/20 text-subject-qr group-hover:bg-subject-qr/30",
      title: "Quantitative Reasoning",
      desc: "Calculator keypad speed, mental maths fluency and unit conversion drills.",
      label: "3 trainers",
    },
    {
      onClick: onSjt,
      icon: Users,
      accent: "bg-subject-sjt/20 text-subject-sjt group-hover:bg-subject-sjt/30",
      title: "Situational Judgement",
      desc: "Appropriateness rating, importance rating and ranking questions.",
      label: "3 trainers",
    },
  ] as const;

  return (
    <section className="py-12 sm:py-16 bg-slate-900">
      <LandingContainer>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">UCAT sections</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">Pick a section to open the hub</h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Each hub groups every drill for that subtest. Start anywhere - your first session can take
            under two minutes.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {cards.map(({ onClick, icon: Icon, accent, title, desc, label }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="group relative flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-all hover:border-white/25 hover:bg-white/10 md:flex-col md:items-center md:rounded-2xl md:p-6 md:text-center"
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 md:h-auto md:w-auto md:rounded-full md:p-3 md:group-hover:scale-110",
                  accent,
                )}
              >
                <Icon className="h-5 w-5 md:h-8 md:w-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 md:flex md:flex-col md:items-center">
                <div className="flex items-start justify-between gap-3 md:block">
                  <h3 className="text-base font-bold leading-snug text-white md:mt-3 md:text-lg">
                    {title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 md:hidden">
                    {label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 md:mt-1.5 md:text-sm">{desc}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-300 md:mt-3 md:text-sm">
                  Open hub
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                </span>
              </div>
            </button>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}
