import { useState, type ReactNode } from "react";
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
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import ProductUpsell from "../layout/ProductUpsell";
import {
  COURSE_COPY,
  getActiveCourses,
  getPackageForStream,
  PACKAGE_LINKS,
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

const EXTERNAL = { target: "_blank" as const, rel: "noopener noreferrer" };

const SECTION_ORDER: LandingTrainerSection[] = ["vr", "dm", "qr", "sjt"];

const SECTION_ICONS: Record<LandingTrainerSection, typeof BookOpen> = {
  vr: BookOpen,
  dm: Scale,
  qr: Calculator,
  sjt: Users,
};

const SECTION_ACCENT: Record<LandingTrainerSection, string> = {
  vr: "text-blue-600 bg-blue-50 border-blue-100",
  dm: "text-amber-600 bg-amber-50 border-amber-100",
  qr: "text-emerald-600 bg-emerald-50 border-emerald-100",
  sjt: "text-purple-600 bg-purple-50 border-purple-100",
};

function LandingContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{children}</p>
  );
}

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground", className)}>
      {children}
    </h2>
  );
}

function SectionIntro({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl", className)}>
      {children}
    </p>
  );
}

function TrustStars({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-500", className)} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
      <LandingContainer className="py-10 sm:py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Free UCAT skills trainer
        </p>
        <h1 className="mt-3 text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
          Train the skills behind a strong UCAT score.
        </h1>
        <p className="mt-4 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {LANDING_TRAINER_COUNT} focused drills for Verbal Reasoning, Decision Making, Quantitative
          Reasoning and Situational Judgement. Open any trainer instantly. Sign in only when you want
          progress saved.
        </p>

        <LandingTrustStrip className="mt-8 justify-center" />

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/verbal"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Browse Verbal Reasoning
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href="#all-trainers"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-muted/50 transition-colors"
          >
            See every drill
          </a>
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
      accent: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
      title: "Verbal Reasoning",
      desc: "Speed reading, rapid recall, keyword scanning and inference.",
      label: "4 trainers",
    },
    {
      onClick: onDecision,
      icon: Scale,
      accent: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
      title: "Decision Making",
      desc: "Syllogism micro and macro drills for UCAT-style logic.",
      label: "2 trainers",
    },
    {
      onClick: onQuant,
      icon: Calculator,
      accent: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
      title: "Quantitative Reasoning",
      desc: "Calculator keypad speed and mental maths fluency.",
      label: "2 trainers",
    },
    {
      onClick: onSjt,
      icon: Users,
      accent: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
      title: "Situational Judgement",
      desc: "Appropriateness rating, importance rating and ranking questions.",
      label: "3 trainers",
    },
  ] as const;

  return (
    <section className="py-12 sm:py-16">
      <LandingContainer>
        <div className="text-center max-w-2xl mx-auto">
          <SectionEyebrow>UCAT sections</SectionEyebrow>
          <SectionTitle>Pick a section to open the hub</SectionTitle>
          <SectionIntro>
            Each hub groups every drill for that subtest. Start anywhere: your first session can take
            under two minutes.
          </SectionIntro>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {cards.map(({ onClick, icon: Icon, accent, title, desc, label }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="group relative flex flex-col items-center p-6 sm:p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-center text-left md:text-center"
            >
              <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <div
                className={cn(
                  "p-3 rounded-full group-hover:scale-110 transition-transform duration-300",
                  accent,
                )}
              >
                <Icon className="w-9 h-9" aria-hidden />
              </div>
              <h3 className="mt-4 text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              <span className="mt-4 text-sm font-medium text-primary inline-flex items-center gap-1">
                Open hub
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

export function LandingHowItWorks() {
  const steps = [
    {
      icon: Target,
      title: "Spot the bottleneck",
      body: "Slow reading, weak recall, syllogism hesitation or numpad drag. Each drill targets one reflex.",
    },
    {
      icon: Zap,
      title: "Drill for ten minutes",
      body: "Short, timed sessions you can stack daily. Streaks and history appear when you sign in.",
    },
    {
      icon: TrendingUp,
      title: "Apply in mocks and plan",
      body: "Log Medify or official mock scores, then use the free study plan to schedule what comes next.",
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-muted/40 border-y border-border">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>How it fits together</SectionEyebrow>
          <SectionTitle>Skills first, then your question bank</SectionTitle>
          <SectionIntro>
            The UCAT rewards speed and pattern recognition. This trainer builds those reflexes so full
            mocks and third-party banks feel easier, not the other way around.
          </SectionIntro>
        </div>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Step {index + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
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
          open
            ? "bg-muted border-b border-border hover:bg-muted/90"
            : "bg-muted hover:bg-muted/90",
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
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
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
      ) : null}
    </div>
  );
}

export function LandingDrillCatalog() {
  return (
    <section id="all-trainers" className="py-12 sm:py-16 scroll-mt-20">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>Every drill</SectionEyebrow>
          <SectionTitle>All {LANDING_TRAINER_COUNT} skill trainers</SectionTitle>
          <SectionIntro>
            Each drill isolates one exam reflex. Stack a few minutes daily across sections and speed
            compounds through the cycle.
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

export function LandingPlanning({ plannerOn }: { plannerOn: boolean }) {
  if (!plannerOn) return null;

  const cards = [
    {
      to: "/study-plan",
      icon: CalendarDays,
      accent: "bg-violet-50 text-violet-600",
      title: "Study plan",
      desc: "Personalised timetable and daily revision slots. Free on this device.",
      cta: "Open study planner",
    },
    {
      to: "/mock-scores",
      icon: LineChart,
      accent: "bg-rose-50 text-rose-600",
      title: "Mock scores",
      desc: "Log Medify, official and other mock results in one place.",
      cta: "Open mock tracker",
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-muted/40 border-y border-border">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>Planning and progress</SectionEyebrow>
          <SectionTitle>Free tools beyond the drills</SectionTitle>
          <SectionIntro>
            Pair skill work with a generated study plan and a mock score log. No subscription required
            for either tool.
          </SectionIntro>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl">
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

export function LandingPaidSupport() {
  const courses = getActiveCourses();
  const genericPackage = getPackageForStream(null);

  return (
    <section className="py-12 sm:py-16 border-t border-border">
      <LandingContainer>
        <div className="max-w-2xl">
          <SectionEyebrow>Optional paid support</SectionEyebrow>
          <SectionTitle>Courses, tutoring and application packages</SectionTitle>
          <SectionIntro>
            The skills trainer stays free. When you want live teaching or end-to-end application help,
            these are run by the same team behind TheUKCATPeople.
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

export function LandingReviews() {
  return (
    <section className="py-12 sm:py-16 bg-muted/40 border-y border-border">
      <LandingContainer>
        <div className="text-center max-w-2xl mx-auto">
          <SectionEyebrow>Reviews</SectionEyebrow>
          <SectionTitle>What students say on Trustpilot</SectionTitle>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm sm:text-base text-muted-foreground">
            <span className="inline-flex items-center gap-2.5">
              <TrustStars className="shrink-0" />
              <span className="font-semibold text-foreground">{TRUSTPILOT_STATS.ratedLabel}</span>
            </span>
            <span className="text-muted-foreground">· {TRUSTPILOT_STATS.label}</span>
          </div>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {LANDING_TRUSTPILOT_REVIEWS.map((snippet) => (
            <blockquote
              key={`${snippet.author}-${snippet.dateLabel}`}
              className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <TrustStars className="mb-3" />
              <p className="text-sm text-foreground leading-relaxed flex-1">
                &ldquo;{snippet.quote}&rdquo;
              </p>
              <footer className="mt-3 text-xs text-muted-foreground">
                {snippet.author}
                {snippet.dateLabel ? ` · ${snippet.dateLabel}` : ""}
              </footer>
            </blockquote>
          ))}
        </div>
        <p className="mt-8 text-center">
          <a
            href={TRUSTPILOT_URL}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
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

export function LandingCredibility() {
  const stats = [
    {
      stat: "10,000+",
      label: "Students supported",
      desc: "Over 14 years helping UK medical and dental applicants.",
    },
    {
      stat: String(LANDING_TRAINER_COUNT),
      label: "Skill trainers",
      desc: "Focused drills across VR, DM, QR and SJT, free to open.",
    },
    {
      stat: TRUSTPILOT_STATS.score,
      label: "Trustpilot rating",
      desc: `${TRUSTPILOT_STATS.label} from verified public reviews.`,
    },
    {
      stat: "Evidence",
      label: "Based methods",
      desc: "Built on speed-reading and retrieval-practice research we teach on courses.",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <LandingContainer>
        <div className="text-center max-w-2xl mx-auto">
          <SectionEyebrow>Why TheUKCATPeople</SectionEyebrow>
          <SectionTitle>Built for applicants, backed by experience</SectionTitle>
          <SectionIntro className="mx-auto">
            The same team runs live UCAT courses, 1-1 tutoring and full application packages. This trainer
            is the free skills layer we wish every student had before their first mock.
          </SectionIntro>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ stat, label, desc }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm text-center sm:text-left"
            >
              <p className="text-2xl font-bold text-foreground">{stat}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{label}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground max-w-xl mx-auto">
          Need a human in the loop?{" "}
          <a
            href={TUTORING_OFFER.href}
            className="font-medium text-primary hover:underline"
            {...EXTERNAL}
          >
            Book 1-1 UCAT tutoring
          </a>{" "}
          or explore our{" "}
          <a
            href={genericPackageHref()}
            className="font-medium text-primary hover:underline"
            {...EXTERNAL}
          >
            ultimate packages
          </a>
          .
        </p>
      </LandingContainer>
    </section>
  );
}

function genericPackageHref(): string {
  return getPackageForStream(null).href;
}
