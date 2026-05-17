import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, CalendarCheck, GraduationCap, Sparkles, X } from "lucide-react";
import { trackEvent } from "../../lib/analytics";
import { useAuth } from "../../hooks/useAuth";
import type { Stream } from "../../lib/profileApi";
import {
  COURSE_COPY,
  STRATEGY_CALL_URL,
  TUTORING_COPY,
  TUTORING_OFFER,
  TRUSTPILOT_URL,
  UCAT_TUTORING_URL,
  dismissUpsell,
  formatCourseDatesHint,
  getActiveCourses,
  getNextUpcomingCourse,
  getPackageForStream,
  getSecondaryUpcomingCourse,
  getUpsellProfileContext,
  isExamWithinWeeks,
  isUpsellDismissed,
  personalizeUpsellText,
  type UpsellOffer,
  type UpsellPlacement,
  type UcatOneDayCourse,
} from "../../lib/productUpsell";
import {
  TRUSTPILOT_STATS,
  formatTrustpilotQuote,
  getTrustpilotSnippet,
} from "../../lib/trustpilotSocialProof";
import { cn } from "../../lib/cn";

const EXTERNAL = { target: "_blank" as const, rel: "noopener noreferrer" };

export type ProductUpsellVariant =
  | "hero"
  | "aside"
  | "sidebar"
  | "card"
  | "inline"
  | "hub_strip"
  | "footer";

type ProductUpsellProps = {
  variant: ProductUpsellVariant;
  offer: UpsellOffer;
  placement: UpsellPlacement;
  stream?: Stream | null;
  /** First name when signed in (e.g. from profile). */
  firstName?: string | null;
  accuracy?: number;
  dismissible?: boolean;
  className?: string;
};

function trackClick(
  offer: UpsellOffer,
  placement: UpsellPlacement,
  stream: Stream | null | undefined,
  courseId: string | null,
) {
  trackEvent("upsell_click", {
    offer,
    placement,
    stream: stream ?? "unknown",
    course_id: courseId,
  });
}

function useImpression(
  placement: UpsellPlacement,
  offer: UpsellOffer,
  courseId: string | null,
  enabled: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (!enabled || sent.current) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (sent.current || !entries.some((e) => e.isIntersecting)) return;
        sent.current = true;
        trackEvent("upsell_impression", { offer, placement, course_id: courseId });
        obs.disconnect();
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [placement, offer, courseId, enabled]);
  return ref;
}

function UpsellLink({
  href,
  className,
  onTrack,
  children,
}: {
  href: string;
  className?: string;
  onTrack: () => void;
  children: ReactNode;
}) {
  return (
    <a href={href} className={className} {...EXTERNAL} onClick={onTrack}>
      {children}
    </a>
  );
}

function HeroShine() {
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]"
      aria-hidden
    />
  );
}

function TrustpilotLink({
  className,
  children,
  tone = "default",
}: {
  className?: string;
  children: ReactNode;
  tone?: "default" | "teal" | "slate";
}) {
  return (
    <a
      href={TRUSTPILOT_URL}
      className={cn(
        "underline underline-offset-2",
        tone === "teal" && "text-teal-100/90 hover:text-white",
        tone === "slate" && "text-slate-200 hover:text-white",
        tone === "default" && "text-primary hover:underline",
        className,
      )}
      {...EXTERNAL}
    >
      {children}
    </a>
  );
}

function TrustpilotQuote({
  offer,
  tone = "default",
  className,
}: {
  offer: UpsellOffer;
  tone?: "default" | "teal" | "slate";
  className?: string;
}) {
  const snippet = getTrustpilotSnippet(offer);
  return (
    <p
      className={cn(
        "text-[11px] leading-relaxed",
        tone === "teal" && "text-teal-100/85",
        tone === "slate" && "text-slate-300",
        tone === "default" && "text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          tone === "teal" && "text-teal-50/95",
          tone === "slate" && "text-slate-200",
          tone === "default" && "text-foreground/80",
        )}
      >
        {formatTrustpilotQuote(snippet)}
      </span>{" "}
      <TrustpilotLink tone={tone}>{TRUSTPILOT_STATS.shortRated}</TrustpilotLink>
    </p>
  );
}

function CourseHeroBlock({
  course,
  placement,
  stream,
  firstName,
  dismissible,
  className,
}: {
  course: UcatOneDayCourse;
  placement: UpsellPlacement;
  stream?: Stream | null;
  firstName?: string | null;
  dismissible?: boolean;
  className?: string;
}) {
  const [hidden, setHidden] = useState(() => isUpsellDismissed(placement, course.id));
  const ref = useImpression(placement, "course", course.id, !hidden);
  const datesHint = formatCourseDatesHint();

  if (hidden) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white shadow-lg",
        className,
      )}
    >
      <HeroShine />
      <div className="relative p-4 sm:p-5">
        {dismissible ? (
          <button
            type="button"
            className="absolute top-3 right-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
            onClick={() => {
              dismissUpsell(placement, course.id);
              setHidden(true);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="min-w-0 flex-1 pr-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100 mb-2">
              <Sparkles className="h-3 w-3" aria-hidden />
              {COURSE_COPY.badge} · £{course.priceGbp}
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-200/90 mb-1">
              {COURSE_COPY.eyebrow}
            </p>
            <h2 className="text-lg sm:text-xl font-bold leading-snug">
              {personalizeUpsellText(
                firstName,
                `join our Ultimate UCAT 1-day course on ${course.displayDate}`,
              )}
            </h2>
            <p className="mt-1.5 text-sm text-teal-100/90 leading-relaxed">
              £{course.priceGbp} · {course.instructor} · All 4 sections · {course.timeLabel}
            </p>
            {datesHint && getActiveCourses().length > 1 ? (
              <p className="mt-1 text-xs text-teal-200/80">{datesHint}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-teal-200/70">{COURSE_COPY.trustLine}</p>
            <TrustpilotQuote offer="course" tone="teal" className="mt-2" />
          </div>
          <UpsellLink
            href={course.href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-teal-900 shadow-sm hover:bg-teal-50 transition-colors"
            onTrack={() => trackClick("course", placement, stream, course.id)}
          >
            {COURSE_COPY.cta}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </UpsellLink>
        </div>
      </div>
    </div>
  );
}

/** Compact course promo for a right-hand column (e.g. study-plan onboarding). */
function CourseAsideBlock({
  course,
  placement,
  stream,
  firstName,
  dismissible,
  className,
}: {
  course: UcatOneDayCourse;
  placement: UpsellPlacement;
  stream?: Stream | null;
  firstName?: string | null;
  dismissible?: boolean;
  className?: string;
}) {
  const [hidden, setHidden] = useState(() => isUpsellDismissed(placement, course.id));
  const ref = useImpression(placement, "course", course.id, !hidden);
  const datesHint = formatCourseDatesHint();

  if (hidden) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-xl border border-teal-700/40 bg-gradient-to-b from-teal-900 to-emerald-900 text-white shadow-md",
        className,
      )}
    >
      <HeroShine />
      <div className="relative p-4 space-y-3">
        {dismissible ? (
          <button
            type="button"
            className="absolute top-2.5 right-2.5 rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss"
            onClick={() => {
              dismissUpsell(placement, course.id);
              setHidden(true);
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-300/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
          <Sparkles className="h-3 w-3" aria-hidden />
          Live · £{course.priceGbp}
        </span>
        <div className="pr-6">
          <p className="text-[10px] font-medium uppercase tracking-wide text-teal-200/80">
            Optional live course
          </p>
          <h3 className="mt-1 text-base font-bold leading-snug">
            {firstName?.trim()
              ? `${firstName.trim()}, Ultimate UCAT 1-day course`
              : "Ultimate UCAT 1-day course"}
          </h3>
          <p className="mt-1 text-sm text-teal-100/90">{course.displayDate}</p>
          <p className="mt-1.5 text-xs text-teal-200/75 leading-relaxed">
            {course.instructor} · {course.timeLabel}
          </p>
          {datesHint && getActiveCourses().length > 1 ? (
            <p className="mt-1 text-[11px] text-teal-200/70">{datesHint}</p>
          ) : null}
        </div>
        <UpsellLink
          href={course.href}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 transition-colors"
          onTrack={() => trackClick("course", placement, stream, course.id)}
        >
          {COURSE_COPY.cta}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </UpsellLink>
        <p className="text-[10px] text-teal-200/65 leading-relaxed">{COURSE_COPY.trustLine}</p>
        <TrustpilotQuote offer="course" tone="teal" className="!text-[10px]" />
      </div>
    </div>
  );
}

function PackageHeroBlock({
  pkg,
  placement,
  stream,
  firstName,
  dismissible,
  className,
}: {
  pkg: ReturnType<typeof getPackageForStream>;
  placement: UpsellPlacement;
  stream?: Stream | null;
  firstName?: string | null;
  dismissible?: boolean;
  className?: string;
}) {
  const offerId = `package-${pkg.label}`;
  const [hidden, setHidden] = useState(() => isUpsellDismissed(placement, offerId));
  const ref = useImpression(placement, "package", null, !hidden);

  if (hidden) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md",
        className,
      )}
    >
      <HeroShine />
      <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {dismissible ? (
          <button
            type="button"
            className="absolute top-3 right-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10"
            aria-label="Dismiss"
            onClick={() => {
              dismissUpsell(placement, offerId);
              setHidden(true);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
            Application support
          </p>
          <h2 className="text-lg font-bold">{personalizeUpsellText(firstName, pkg.headline)}</h2>
          <p className="mt-1 text-sm text-slate-300">{pkg.subline}</p>
          <TrustpilotQuote offer="package" tone="slate" className="mt-2" />
        </div>
        <UpsellLink
          href={pkg.href}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          onTrack={() => trackClick("package", placement, stream, null)}
        >
          {pkg.cta}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </UpsellLink>
      </div>
    </div>
  );
}

function TutoringHeroBlock({
  placement,
  stream,
  firstName,
  className,
}: {
  placement: UpsellPlacement;
  stream?: Stream | null;
  firstName?: string | null;
  className?: string;
}) {
  const ref = useImpression(placement, "tutoring", null, true);
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 to-emerald-700 text-white shadow-lg",
        className,
      )}
    >
      <HeroShine />
      <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-200/90">
            {TUTORING_OFFER.eyebrow}
          </p>
          <h2 className="text-lg font-bold">
            {personalizeUpsellText(firstName, TUTORING_OFFER.headline)}
          </h2>
          <p className="text-sm text-teal-100/90 mt-0.5">{TUTORING_OFFER.subline}</p>
          <TrustpilotQuote offer="tutoring" tone="teal" className="mt-2" />
        </div>
        <UpsellLink
          href={TUTORING_OFFER.href}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-teal-900 hover:bg-teal-50"
          onTrack={() => trackClick("tutoring", placement, stream, null)}
        >
          {TUTORING_OFFER.cta}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </UpsellLink>
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  placement,
  stream,
  accuracy,
  compact = false,
  className,
}: {
  offer: UpsellOffer;
  placement: UpsellPlacement;
  stream?: Stream | null;
  firstName?: string | null;
  accuracy?: number;
  compact?: boolean;
  className?: string;
}) {
  const course = offer === "course" ? getNextUpcomingCourse() : null;
  const pkg = offer === "package" ? getPackageForStream(stream ?? null) : null;
  const courseId = course?.id ?? null;
  const ref = useImpression(placement, offer, courseId, true);

  const tutoringSubline =
    accuracy != null && accuracy < 70
      ? "Struggling on this drill? Our UCAT experts can help you improve."
      : accuracy != null && accuracy >= 85
        ? "Keep building confidence with personalised 1-1 tutoring."
        : TUTORING_OFFER.subline;

  if (offer === "course" && !course) return null;

  return (
    <div
      ref={ref}
      className={cn(
        compact
          ? "p-3 bg-transparent"
          : "rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      {offer === "course" && course ? (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            {compact ? "Live course" : COURSE_COPY.badge} · £{course.priceGbp}
          </p>
          <p className={cn("font-semibold text-foreground", compact ? "text-sm leading-snug" : "text-sm")}>
            {compact ? course.displayDate : `${course.label} · ${course.displayDate}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {course.instructor} · {course.timeLabel}
          </p>
          {!compact && formatCourseDatesHint() && getActiveCourses().length > 1 ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{formatCourseDatesHint()}</p>
          ) : null}
          {!compact ? <TrustpilotQuote offer="course" className="mt-2" /> : null}
          <UpsellLink
            href={course.href}
            className={cn(
              "inline-flex items-center gap-1 font-medium text-primary hover:underline",
              compact ? "mt-2 text-xs" : "mt-3 text-sm font-semibold",
            )}
            onTrack={() => trackClick("course", placement, stream, course.id)}
          >
            {COURSE_COPY.cta}
            <ArrowUpRight className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          </UpsellLink>
        </>
      ) : null}
      {offer === "tutoring" ? (
        <>
          <p className={cn("font-semibold text-foreground", compact ? "text-sm leading-snug" : "text-sm")}>
            {compact ? TUTORING_OFFER.sidebarTitle : TUTORING_OFFER.headline}
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {compact ? TUTORING_OFFER.sidebarSub : tutoringSubline}
          </p>
          {!compact ? <TrustpilotQuote offer="tutoring" className="mt-2" /> : null}
          <UpsellLink
            href={UCAT_TUTORING_URL}
            className={cn(
              "inline-flex items-center gap-1 font-medium text-primary hover:underline",
              compact ? "mt-2 text-xs" : "mt-3 text-sm font-semibold",
            )}
            onTrack={() => trackClick("tutoring", placement, stream, null)}
          >
            {TUTORING_OFFER.cta}
            <ArrowUpRight className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          </UpsellLink>
        </>
      ) : null}
      {offer === "package" && pkg ? (
        <>
          <p className={cn("font-semibold text-foreground", compact ? "text-sm leading-snug" : "text-sm")}>
            {pkg.headline}
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{pkg.subline}</p>
          {!compact ? <TrustpilotQuote offer="package" className="mt-2" /> : null}
          <UpsellLink
            href={pkg.href}
            className={cn(
              "inline-flex items-center gap-1 font-medium text-primary hover:underline",
              compact ? "mt-2 text-xs" : "mt-3 text-sm font-semibold",
            )}
            onTrack={() => trackClick("package", placement, stream, null)}
          >
            {pkg.cta}
            <ArrowUpRight className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          </UpsellLink>
        </>
      ) : null}
    </div>
  );
}

function OnboardingAsideRow({
  placement,
  offer,
  courseId,
  eyebrow,
  title,
  description,
  href,
  cta,
  stream,
}: {
  placement: UpsellPlacement;
  offer: UpsellOffer;
  courseId: string | null;
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  cta: string;
  stream?: Stream | null;
}) {
  const ref = useImpression(placement, offer, courseId, true);

  return (
    <div ref={ref} className="pb-4 border-b border-border/70 last:border-0 last:pb-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <UpsellLink
        href={href}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        onTrack={() => trackClick(offer, placement, stream, courseId)}
      >
        {cta}
        <ArrowUpRight className="h-3 w-3 opacity-70" aria-hidden />
      </UpsellLink>
    </div>
  );
}

const EXTRAS_ASIDE_INTRO: Partial<Record<UpsellPlacement, string>> = {
  planner_onboarding_aside:
    "Paid support from TheUKCATPeople. Your free study plan never requires these.",
  mock_scores:
    "Optional paid support - the free mock tracker never requires these.",
};

/** Right-hand panel: course → tutoring → package (onboarding, mock scores, etc.). */
export function PlannerExtrasAside({
  placement,
  stream,
  firstName,
  className,
  panel = false,
  intro,
}: {
  placement: UpsellPlacement;
  stream?: Stream | null;
  firstName?: string | null;
  className?: string;
  /** Full-height rail beside main content (desktop). */
  panel?: boolean;
  intro?: string;
}) {
  const course = getNextUpcomingCourse();
  const pkg = getPackageForStream(stream ?? null);
  const datesHint = formatCourseDatesHint();

  const courseDescription = course
    ? [
        `${course.instructor} · ${course.timeLabel}`,
        datesHint && getActiveCourses().length > 1 ? datesHint : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <aside
      className={cn(
        "flex w-full min-w-0 flex-col",
        panel && "min-h-full border-border bg-muted/25 lg:border-l",
        className,
      )}
      aria-label="Optional paid support"
    >
      <div
        className={cn(
          "flex flex-1 flex-col",
          panel ? "px-5 py-8 sm:px-6 lg:py-10" : "py-0",
        )}
      >
        <header className={panel ? "mb-6" : "mb-4"}>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Optional extras
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">
            {intro ?? EXTRAS_ASIDE_INTRO[placement] ?? EXTRAS_ASIDE_INTRO.planner_onboarding_aside}
          </p>
        </header>

        <div className="space-y-4">
          {course ? (
            <OnboardingAsideRow
              placement={placement}
              offer="course"
              courseId={course.id}
              stream={stream}
              eyebrow={`${COURSE_COPY.badge} · £${course.priceGbp}`}
              title={course.displayDate}
              description={courseDescription}
              href={course.href}
              cta={COURSE_COPY.cta}
            />
          ) : null}
          <OnboardingAsideRow
            placement={placement}
            offer="tutoring"
            courseId={null}
            stream={stream}
            eyebrow="1-1 tutoring"
            title={personalizeUpsellText(firstName, TUTORING_OFFER.sidebarTitle)}
            description={TUTORING_OFFER.sidebarSub}
            href={TUTORING_OFFER.href}
            cta={TUTORING_OFFER.cta}
          />
          <OnboardingAsideRow
            placement={placement}
            offer="package"
            courseId={null}
            stream={stream}
            eyebrow="Application support"
            title={personalizeUpsellText(firstName, pkg.headline)}
            description={pkg.subline}
            href={pkg.href}
            cta={pkg.cta}
          />
        </div>

        <p className={cn("mt-auto pt-6 text-[11px] leading-relaxed text-muted-foreground", !panel && "pt-4")}>
          {TRUSTPILOT_STATS.label}.{" "}
          <a
            href={TRUSTPILOT_URL}
            className="text-foreground/80 underline underline-offset-2 hover:text-primary"
            {...EXTERNAL}
          >
            {TRUSTPILOT_STATS.shortRated}
          </a>
        </p>
      </div>
    </aside>
  );
}

/** @deprecated Use {@link PlannerExtrasAside} — kept for onboarding imports. */
export function PlannerOnboardingAside(
  props: Omit<Parameters<typeof PlannerExtrasAside>[0], "placement">,
) {
  return <PlannerExtrasAside placement="planner_onboarding_aside" {...props} />;
}

function HubStrip({
  placement,
  stream,
  className,
}: {
  placement: UpsellPlacement;
  stream?: Stream | null;
  className?: string;
}) {
  const course = getNextUpcomingCourse();
  if (!course) return null;
  return (
    <div className={cn("rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm", className)}>
      <span className="text-muted-foreground">{COURSE_COPY.hubStrip} </span>
      <UpsellLink
        href={course.href}
        className="font-medium text-primary hover:underline inline-flex items-center gap-0.5"
        onTrack={() => trackClick("course", placement, stream, course.id)}
      >
        {course.displayDate}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </UpsellLink>
    </div>
  );
}

function FooterTutoring() {
  return (
    <div className="text-center text-sm text-slate-500 mb-2 space-y-1" aria-label="Trust and tutoring info">
      <p>
        {TUTORING_COPY.trustLine}{" "}
        <a href={TRUSTPILOT_URL} className="text-slate-600 hover:text-blue-600 transition-colors" {...EXTERNAL}>
          {TUTORING_COPY.ratedTrustpilot}
        </a>
        {" - "}
        <a
          href={UCAT_TUTORING_URL}
          className="text-slate-600 hover:text-blue-600 font-medium"
          {...EXTERNAL}
          onClick={() => trackClick("tutoring", "footer", null, null)}
        >
          {TUTORING_COPY.footerCta}
        </a>
        .
      </p>
    </div>
  );
}

function InlineTutoring() {
  return (
    <p className="text-center text-sm text-muted-foreground mt-6">
      {TUTORING_COPY.expertLine}{" "}
      <a
        href={UCAT_TUTORING_URL}
        className="text-blue-600 hover:underline font-medium"
        {...EXTERNAL}
        onClick={() => trackClick("tutoring", "landing_hero", null, null)}
      >
        {TUTORING_COPY.linkText}
      </a>
      .
    </p>
  );
}

export function ProductUpsellSidebar({
  stream: streamProp,
  firstName: firstNameProp,
  iconOnly,
}: {
  stream?: Stream | null;
  firstName?: string | null;
  iconOnly?: boolean;
}) {
  const { user, profile } = useAuth();
  const ctx = getUpsellProfileContext(user, profile);
  const stream = streamProp ?? ctx.stream;
  const firstName = firstNameProp ?? ctx.firstName;
  const course = getNextUpcomingCourse();
  const secondary = getSecondaryUpcomingCourse();
  const pkg = getPackageForStream(stream ?? null);

  if (iconOnly) {
    if (!course) return null;
    return (
      <div className="mx-2 mb-2 flex justify-center">
        <a
          href={course.href}
          {...EXTERNAL}
          title={`UCAT course £${course.priceGbp}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
          onClick={() => trackClick("course", "sidebar", stream, course.id)}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
        </a>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 mt-auto space-y-2 border-t border-white/10 pt-3 shrink-0" aria-label="Optional paid support">
      <StrategyCallBanner variant="sidebar" />
      {course ? (
        <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-400/25 p-3">
          <UpsellLink
            href={course.href}
            className="group block rounded-lg -m-1 p-1 outline-offset-2 transition-colors hover:bg-amber-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200/70"
            onTrack={() => trackClick("course", "sidebar", stream, course.id)}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
              Live course · £{course.priceGbp}
            </p>
            <p className="text-sm font-semibold text-white mt-0.5 leading-snug">1-day UCAT course</p>
            <p className="text-xs text-sky-200/80 mt-0.5">
              {course.displayDate.replace(/^\w+\s+/, "")} · {course.instructor}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-100 group-hover:text-white">
              {COURSE_COPY.cta}
              <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
            </span>
          </UpsellLink>
          {secondary ? (
            <a
              href={secondary.href}
              {...EXTERNAL}
              className="mt-1 block text-[10px] text-sky-300/70 hover:text-sky-200"
              onClick={() => trackClick("course", "sidebar", stream, secondary.id)}
            >
              Also {secondary.displayDate.replace(/^\w+\s+/, "")}
            </a>
          ) : null}
        </div>
      ) : null}
      <a
        href={TUTORING_OFFER.href}
        {...EXTERNAL}
        className="block rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2.5 transition-colors"
        onClick={() => trackClick("tutoring", "sidebar", stream, null)}
      >
        <p className="text-sm font-medium text-white">
          {firstName ? `${firstName}, ${TUTORING_OFFER.sidebarTitle}` : TUTORING_OFFER.sidebarTitle}
        </p>
        <p className="text-[11px] text-sky-200/80">{TUTORING_OFFER.sidebarSub}</p>
      </a>
      <a
        href={pkg.href}
        {...EXTERNAL}
        className="block rounded-xl px-3 py-2 text-[11px] text-sky-300/80 hover:text-sky-100 hover:bg-white/5 transition-colors"
        onClick={() => trackClick("package", "sidebar", stream, null)}
      >
        {personalizeUpsellText(firstName, pkg.headline)} →
      </a>
    </div>
  );
}

export function PostDrillUpsell({
  stream: streamProp,
  examDateIso: examDateProp,
  firstName: firstNameProp,
  accuracy,
}: {
  stream?: Stream | null;
  examDateIso?: string | null;
  firstName?: string | null;
  accuracy?: number;
}) {
  const { user, profile } = useAuth();
  const ctx = getUpsellProfileContext(user, profile);
  const stream = streamProp ?? ctx.stream;
  const examDateIso = examDateProp ?? ctx.examDateIso;
  const firstName = firstNameProp ?? ctx.firstName;
  const showCourse = getNextUpcomingCourse() != null && isExamWithinWeeks(examDateIso, 8);
  const pkg = getPackageForStream(stream ?? null);

  return (
    <div className="mt-4 w-full max-w-xl mx-auto space-y-3">
      <OfferCard
        offer="tutoring"
        placement="post_drill"
        stream={stream}
        firstName={firstName}
        accuracy={accuracy}
      />
      {showCourse ? (
        <OfferCard
          offer="course"
          placement="post_drill"
          stream={stream}
          firstName={firstName}
          className="border-dashed"
        />
      ) : null}
      {pkg.stream ? (
        <OfferCard offer="package" placement="post_drill" stream={stream} firstName={firstName} />
      ) : null}
    </div>
  );
}

export function DashboardUpsellStack({
  stream,
  firstName,
  showTutoring,
  rail = false,
}: {
  stream?: Stream | null;
  firstName?: string | null;
  showTutoring: boolean;
  /** Narrow column layout (dashboard main + right rail): compact course aside and cards instead of full-width heroes. */
  rail?: boolean;
}) {
  const course = getNextUpcomingCourse();
  const courseDismissed = course != null && isUpsellDismissed("dashboard_hero", course.id);
  const showCourse = course != null && !courseDismissed;
  const showPackageCard = showCourse;

  return (
    <div className={cn(rail ? "space-y-3" : "space-y-4 mb-8")}>
      {showCourse ? (
        <ProductUpsell
          variant={rail ? "aside" : "hero"}
          offer="course"
          placement="dashboard_hero"
          stream={stream}
          firstName={firstName}
          dismissible
        />
      ) : (
        <ProductUpsell
          variant={rail ? "card" : "hero"}
          offer="package"
          placement="dashboard_hero"
          stream={stream}
          firstName={firstName}
          dismissible={!rail}
        />
      )}
      {showPackageCard ? (
        <ProductUpsell
          variant="card"
          offer="package"
          placement="dashboard_hero"
          stream={stream}
          firstName={firstName}
        />
      ) : null}
      {showTutoring ? (
        <ProductUpsell
          variant="card"
          offer="tutoring"
          placement="dashboard_hero"
          stream={stream}
          firstName={firstName}
        />
      ) : null}
    </div>
  );
}

/**
 * "Book a free strategy call" CTA — used across sidebar, footer, landing, dashboard.
 * variant="sidebar"  → compact dark tile (fits inside the app sidebar)
 * variant="card"     → light bordered card for page content areas
 * variant="inline"   → single sentence with a link
 */
export function StrategyCallBanner({
  variant = "card",
  className,
}: {
  variant?: "sidebar" | "card" | "inline";
  className?: string;
}) {
  const handleClick = () =>
    trackEvent("strategy_call_click", { placement: variant });

  if (variant === "inline") {
    return (
      <p className={cn("text-center text-sm text-muted-foreground", className)}>
        Not sure where to start?{" "}
        <a
          href={STRATEGY_CALL_URL}
          className="font-medium text-primary hover:underline"
          {...EXTERNAL}
          onClick={handleClick}
        >
          Book a free strategy call
        </a>{" "}
and we&apos;ll help you pick the right programme.
      </p>
    );
  }

  if (variant === "sidebar") {
    return (
      <a
        href={STRATEGY_CALL_URL}
        {...EXTERNAL}
        className={cn(
          "flex items-center gap-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-2.5",
          "hover:bg-emerald-500/30 transition-colors",
          className,
        )}
        onClick={handleClick}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/25 text-emerald-200">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white leading-tight">Free strategy call</p>
          <p className="text-[10px] text-emerald-200/80 leading-tight">Discuss your options with a doctor</p>
        </div>
      </a>
    );
  }

  // card variant
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <CalendarCheck className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-900">Book a free strategy call</p>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-800/80">
            Speak with a doctor, dentist or vet about the right programme, course or package for you.
          </p>
          <a
            href={STRATEGY_CALL_URL}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
            {...EXTERNAL}
            onClick={handleClick}
          >
            Book your free call
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ProductUpsell({
  variant,
  offer,
  placement,
  stream,
  firstName,
  accuracy,
  dismissible = false,
  className,
}: ProductUpsellProps) {
  const course = getNextUpcomingCourse();
  const pkg = getPackageForStream(stream ?? null);

  if (variant === "footer") return <FooterTutoring />;
  if (variant === "inline") return <InlineTutoring />;
  if (variant === "hub_strip") {
    if (!course) return null;
    return <HubStrip placement={placement} stream={stream} className={className} />;
  }

  if (offer === "course" && !course) {
    return null;
  }

  if (variant === "aside") {
    if (offer === "course" && course) {
      return (
        <CourseAsideBlock
          course={course}
          placement={placement}
          stream={stream}
          firstName={firstName}
          dismissible={dismissible}
          className={className}
        />
      );
    }
    return null;
  }

  if (variant === "hero") {
    if (offer === "course" && course) {
      return (
        <CourseHeroBlock
          course={course}
          placement={placement}
          stream={stream}
          firstName={firstName}
          dismissible={dismissible}
          className={className}
        />
      );
    }
    if (offer === "package") {
      return (
        <PackageHeroBlock
          pkg={pkg}
          placement={placement}
          stream={stream}
          firstName={firstName}
          dismissible={dismissible}
          className={className}
        />
      );
    }
    if (offer === "tutoring") {
      return (
        <TutoringHeroBlock
          placement={placement}
          stream={stream}
          firstName={firstName}
          className={className}
        />
      );
    }
    return null;
  }

  if (variant === "card") {
    return (
      <OfferCard
        offer={offer}
        placement={placement}
        stream={stream}
        firstName={firstName}
        accuracy={accuracy}
        className={className}
      />
    );
  }

  return null;
}
