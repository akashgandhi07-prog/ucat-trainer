import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  LineChart,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";
import ProductUpsell from "../layout/ProductUpsell";
import {
  COURSE_COPY,
  getActiveCourses,
  getPackageForStream,
  PACKAGE_LINKS,
  STRATEGY_CALL_URL,
  TUTORING_OFFER,
  TRUSTPILOT_URL,
  type UcatOneDayCourse,
} from "../../lib/productUpsell";
import {
  LANDING_TRUSTPILOT_REVIEWS,
  TRUSTPILOT_STATS,
} from "../../lib/trustpilotSocialProof";
import {
  LANDING_TRAINER_COUNT,
  LANDING_TRAINER_SECTION_META,
  trainersForSection,
  type LandingTrainerSection,
} from "../../data/landingTrainers";
import { cn } from "../../lib/cn";
import { trackEvent } from "../../lib/analytics";
import { isPlannerIntegrated } from "../../lib/plannerUrl";
import UcatGuidesPanel from "../layout/UcatGuidesPanel";
import TrainerFaqSection from "../seo/TrainerFaqSection";
import { trainerFaqs } from "../../data/trainerFaqs";
import {
  LandingContainer,
  SectionEyebrow,
  SectionIntro,
  SectionTitle,
  TrustStars,
} from "./landingPrimitives";

const EXTERNAL = { target: "_blank" as const, rel: "noopener noreferrer" };

const SECTION_ORDER: LandingTrainerSection[] = ["vr", "dm", "qr", "sjt"];

const SECTION_ICONS: Record<LandingTrainerSection, typeof BookOpen> = {
  vr: BookOpen,
  dm: Scale,
  qr: Calculator,
  sjt: Users,
};

const SECTION_ACCENT: Record<LandingTrainerSection, string> = {
  vr:  "text-subject-vr bg-subject-vr/10 border-subject-vr/15",
  dm:  "text-subject-dm bg-subject-dm/10 border-subject-dm/15",
  qr:  "text-subject-qr bg-subject-qr/10 border-subject-qr/15",
  sjt: "text-subject-sjt bg-subject-sjt/10 border-subject-sjt/15",
};

const SECTION_HEADER_BG: Record<LandingTrainerSection, string> = {
  vr:  "bg-secondary hover:bg-secondary/80 border-border",
  dm:  "bg-secondary hover:bg-secondary/80 border-border",
  qr:  "bg-secondary hover:bg-secondary/80 border-border",
  sjt: "bg-secondary hover:bg-secondary/80 border-border",
};

function LandingHowItWorks() {
  const steps = [
    {
      title: "Spot the bottleneck",
      body: "Slow reading, weak recall, syllogism hesitation or numpad drag. Each drill targets one reflex.",
    },
    {
      title: "Drill for ten minutes",
      body: "Short, timed sessions you can stack daily. Streaks and history appear when you sign in.",
    },
    {
      title: "Apply in mocks and plan",
      body: "Log Medify or official mock scores, then use the free study plan to schedule what comes next.",
    },
  ];

  return (
    <section className="py-10 sm:py-14 border-b border-border">
      <LandingContainer>
        <div className="max-w-xl">
          <SectionEyebrow>How it fits together</SectionEyebrow>
          <SectionTitle>Skills first, then your UCAT question bank</SectionTitle>
          <SectionIntro>
            The UCAT rewards speed and pattern recognition. These drills build those reflexes so full
            mocks feel easier, not the other way around.
          </SectionIntro>
        </div>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map(({ title, body }, index) => (
            <li key={title} className="flex gap-4 sm:flex-col sm:gap-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-base sm:mb-5">
                {index + 1}
              </div>
              <div className="sm:flex-1">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  );
}

function DrillSectionAccordion({
  section,
  defaultOpen,
}: {
  section: LandingTrainerSection;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = LANDING_TRAINER_SECTION_META[section];
  const Icon = SECTION_ICONS[section];
  const trainers = trainersForSection(section);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-4 p-4 sm:p-5 text-left transition-colors",
          SECTION_HEADER_BG[section],
          open && "border-b",
        )}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            SECTION_ACCENT[section],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-foreground">{meta.label}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{meta.summary}</span>
        </span>
        <span className="shrink-0 text-xs font-medium text-muted-foreground mr-1">
          {trainers.length} drills
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-[350ms] ease-out", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-[350ms] ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 sm:px-5 pb-4 sm:pb-5 pt-2 space-y-2">
            {trainers.map((trainer) => (
              <Link
                key={trainer.id}
                to={trainer.href}
                className="group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-border/80 bg-background px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground group-hover:text-primary">
                      {trainer.title}
                    </span>
                    {trainer.tag ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {trainer.tag}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{trainer.description}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary shrink-0">
                  Open drill
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            ))}
            <Link
              to={meta.hubHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-1 px-1"
            >
              Open {meta.label} hub
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingDrillCatalog() {
  return (
    <section id="all-trainers" className="py-10 sm:py-14 scroll-mt-20 bg-muted/30 border-b border-border">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>Every drill</SectionEyebrow>
          <SectionTitle>All {LANDING_TRAINER_COUNT} free UCAT skill trainers</SectionTitle>
          <SectionIntro>
            Each drill isolates one exam reflex. All free UCAT practice questions and trainers are open
            without registration. Stack a few minutes daily across sections and speed compounds through
            the cycle.
          </SectionIntro>
        </div>
        <div className="mt-8 space-y-3">
          {SECTION_ORDER.map((section, i) => (
            <DrillSectionAccordion key={section} section={section} defaultOpen={i === 0} />
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function LandingPlanning({ plannerOn }: { plannerOn: boolean }) {
  if (!plannerOn) return null;

  const cards = [
    {
      to: "/study-plan",
      icon: CalendarDays,
      accent: "bg-primary/10 text-primary",
      title: "Study plan",
      desc: "Personalised timetable and daily revision slots. Free on this device.",
      cta: "Open study planner",
    },
    {
      to: "/mock-scores",
      icon: LineChart,
      accent: "bg-primary/10 text-primary",
      title: "Mock scores",
      desc: "Log free UCAT mock scores from Medify, official practice tests and other resources in one place.",
      cta: "Open mock tracker",
    },
    {
      to: "/study-guides",
      icon: BookOpen,
      accent: "bg-primary/10 text-primary",
      title: "Study guides",
      desc: "Concise topic guides covering every UCAT subtest - a quick reference alongside your practice.",
      cta: "Browse study guides",
    },
  ];

  return (
    <section className="py-10 sm:py-14 border-b border-border">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>Planning and progress</SectionEyebrow>
          <SectionTitle>Free tools beyond the drills</SectionTitle>
          <SectionIntro>
            Pair skill work with a generated study plan, a mock score log, and topic study guides. No
            subscription required for any of these tools.
          </SectionIntro>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl">
          {cards.map(({ to, icon: Icon, accent, title, desc, cta }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col p-6 sm:p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
            >
              <div className={cn("p-3 rounded-full w-fit", accent)}>
                <Icon className="w-8 h-8" aria-hidden />
              </div>
              <h3 className="mt-4 text-xl font-bold text-foreground group-hover:text-primary">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>
              <span className="mt-4 text-sm font-medium text-primary inline-flex items-center gap-1">
                {cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

function LandingCourseCard({ course }: { course: UcatOneDayCourse }) {
  return (
    <a
      href={course.href}
      {...EXTERNAL}
      className="group flex flex-col rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
      onClick={() =>
        trackEvent("upsell_click", {
          offer: "course",
          placement: "landing_hero",
          stream: "unknown",
          course_id: course.id,
        })
      }
    >
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
        <Sparkles className="h-3 w-3" aria-hidden />
        {COURSE_COPY.badge} · £{course.priceGbp}
      </span>
      <h3 className="mt-3 text-lg font-bold text-foreground leading-snug">{course.label}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{course.displayDate}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {course.instructor} · {course.timeLabel}
      </p>
      <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
        Live online day covering all four UCAT sections with Dr Akash Gandhi and the team.
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        {COURSE_COPY.cta}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </span>
    </a>
  );
}

function LandingPaidSupport() {
  const courses = getActiveCourses();
  const genericPackage = getPackageForStream(null);

  return (
    <section className="py-10 sm:py-14 bg-muted/30 border-b border-border">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>Optional paid support</SectionEyebrow>
          <SectionTitle>UCAT courses, coaching and application packages</SectionTitle>
          <SectionIntro>
            The skills trainer stays free. When you want live UCAT coaching, tutoring or end-to-end
            application help, these are run by the same team behind TheUKCATPeople.
          </SectionIntro>
        </div>

        {courses.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-foreground mb-3">Ultimate UCAT 1-day courses</h3>
            <div
              className={cn(
                "grid gap-4",
                courses.length > 1 ? "sm:grid-cols-2" : "max-w-xl",
              )}
            >
              {courses.map((course) => (
                <LandingCourseCard key={course.id} course={course} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{COURSE_COPY.trustLine}</p>
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <ProductUpsell
            variant="hero"
            offer="tutoring"
            placement="landing_hero"
            className="h-full"
          />
          <ProductUpsell variant="hero" offer="package" placement="landing_hero" className="h-full" />
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Ultimate application packages</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {PACKAGE_LINKS.map((pkg) => {
              const offer = getPackageForStream(pkg.stream);
              return (
                <a
                  key={pkg.stream}
                  href={pkg.href}
                  {...EXTERNAL}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
                  onClick={() =>
                    trackEvent("upsell_click", {
                      offer: "package",
                      placement: "landing_hero",
                      stream: pkg.stream,
                      course_id: null,
                    })
                  }
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <GraduationCap className="h-5 w-5" aria-hidden />
                  </span>
                  <h4 className="mt-3 font-semibold text-foreground group-hover:text-primary">
                    {offer.headline}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed flex-1">
                    {offer.subline}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {offer.cta}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </a>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Not sure which path fits?{" "}
            <a
              href={genericPackage.href}
              className="font-medium text-primary underline underline-offset-2"
              {...EXTERNAL}
            >
              Compare all application packages
            </a>
            .
          </p>
        </div>
      </LandingContainer>
    </section>
  );
}

function LandingReviews() {
  return (
    <section className="py-12 sm:py-16 bg-slate-900">
      <LandingContainer>
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Reviews</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">What students say on Trustpilot</h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm sm:text-base text-slate-400">
            <span className="inline-flex items-center gap-2.5">
              <TrustStars className="shrink-0" />
              <span className="font-semibold text-white">{TRUSTPILOT_STATS.ratedLabel}</span>
            </span>
            <span>· {TRUSTPILOT_STATS.label}</span>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {LANDING_TRUSTPILOT_REVIEWS.map((snippet) => (
            <blockquote
              key={`${snippet.author}-${snippet.dateLabel}`}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <TrustStars className="mb-3" />
              <p className="text-sm text-slate-200 leading-relaxed flex-1">
                &ldquo;{snippet.quote}&rdquo;
              </p>
              <footer className="mt-3 text-xs text-slate-500">
                {snippet.author}
                {snippet.dateLabel ? ` · ${snippet.dateLabel}` : ""}
              </footer>
            </blockquote>
          ))}
        </div>
        <p className="mt-8 text-center">
          <a
            href={TRUSTPILOT_URL}
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            {...EXTERNAL}
          >
            Read verified reviews on Trustpilot
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </p>
      </LandingContainer>
    </section>
  );
}

function LandingCredibility() {
  const stats = [
    { stat: "10,000+", label: "Students supported" },
    { stat: String(LANDING_TRAINER_COUNT), label: "Free skill trainers" },
    { stat: TRUSTPILOT_STATS.score, label: "Trustpilot rating" },
    { stat: "14+", label: "Years teaching UCAT" },
  ];

  return (
    <section className="py-8 sm:py-10 border-b border-border">
      <LandingContainer>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground shrink-0">
            Why TheUKCATPeople
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 sm:gap-x-10 sm:flex-1">
            {stats.map(({ stat, label }) => (
              <div key={label} className="text-center sm:text-left">
                <dt className="text-xl sm:text-2xl font-bold text-foreground">{stat}</dt>
                <dd className="mt-0.5 text-xs sm:text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <a
            href={STRATEGY_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Book a free strategy call
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
          <p className="text-sm text-muted-foreground">
            Not sure what you need? We&apos;ll help. Or explore{" "}
            <a href={TUTORING_OFFER.href} className="font-medium text-primary hover:underline" {...EXTERNAL}>
              1-1 tutoring
            </a>
            {" "}and{" "}
            <a href={getPackageForStream(null).href} className="font-medium text-primary hover:underline" {...EXTERNAL}>
              application packages
            </a>
            .
          </p>
        </div>
      </LandingContainer>
    </section>
  );
}

/**
 * All landing-page sections below the fold, bundled into one lazy chunk so the
 * heavy data/copy they import (trainerFaqs, ProductUpsell, productUpsell,
 * landingTrainers, trustpilotSocialProof) stays out of the eager main bundle.
 * Rendered on mount inside a Suspense boundary in LandingPage.
 */
export default function HomeBelowFold() {
  const plannerOn = isPlannerIntegrated();
  return (
    <>
      <LandingHowItWorks />
      <LandingDrillCatalog />
      <LandingPlanning plannerOn={plannerOn} />
      <LandingPaidSupport />
      <LandingReviews />
      <LandingCredibility />
      <section className="py-10 sm:py-12 border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <UcatGuidesPanel embedded context="home" />
        </div>
      </section>
      <TrainerFaqSection
        id="home-faq"
        title="Common questions about this UCAT trainer"
        intro="Answers to common questions about how to use this free UCAT practice platform alongside your main question bank and the official resources."
        faqs={trainerFaqs.home}
      />
    </>
  );
}
