/**
 * Central config for product upsells: 1-day courses, 1-1 tutoring, application packages.
 */

import type { Stream } from "./profileApi";

export const UCAT_TUTORING_URL = "https://www.theukcatpeople.co.uk/ucat-tutoring";
export const TRUSTPILOT_URL = "https://www.trustpilot.com/review/www.theukcatpeople.co.uk";

export type UpsellOffer = "course" | "tutoring" | "package";

export type UpsellPlacement =
  | "dashboard_hero"
  | "sidebar"
  | "post_drill"
  | "hub_strip"
  | "planner_banner"
  | "planner_onboarding_aside"
  | "mock_scores"
  | "landing_hero"
  | "footer";

export type UcatOneDayCourse = {
  id: string;
  label: string;
  date: string;
  displayDate: string;
  timeLabel: string;
  href: string;
  priceGbp: number;
  instructor: string;
  soldOut?: boolean;
};

export const UCAT_ONE_DAY_COURSES: readonly UcatOneDayCourse[] = [
  {
    id: "june-2026",
    label: "Ultimate UCAT 1 Day Course",
    date: "2026-06-28",
    displayDate: "Sat 28 Jun 2026",
    timeLabel: "09:00 to 16:00 UK · Online",
    href: "https://www.theukcatpeople.co.uk/event-details/ultimate-ucat-1-day-course-june-2026-online",
    priceGbp: 179,
    instructor: "Dr Akash Gandhi",
  },
  {
    id: "july-2026",
    label: "Ultimate UCAT 1 Day Course",
    date: "2026-07-12",
    displayDate: "Sun 12 Jul 2026",
    timeLabel: "09:00 to 16:00 UK · Online",
    href: "https://www.theukcatpeople.co.uk/event-details/ultimate-ucat-1-day-course-july-2026-online",
    priceGbp: 179,
    instructor: "Dr Akash Gandhi",
  },
] as const;

/** High-value application packages (footer links, stream-matched upsells). */
export const PACKAGE_LINKS = [
  { label: "Medicine", href: "https://www.theukcatpeople.co.uk/packages", stream: "Medicine" as const },
  {
    label: "Dentistry",
    href: "https://www.theukcatpeople.co.uk/dentistry-application-packages",
    stream: "Dentistry" as const,
  },
  {
    label: "Veterinary",
    href: "https://www.theukcatpeople.co.uk/veterinary-medicine-ultimate-package",
    stream: "Veterinary Medicine" as const,
  },
] as const;

export const TUTORING_OFFER = {
  href: UCAT_TUTORING_URL,
  eyebrow: "THEUKCATPEOPLE · 1-1 UCAT TUTORING",
  headline: "Book 1-1 UCAT tutoring",
  subline: "Personalised coaching from UCAT experts · 14+ years experience",
  cta: "Book a tutor",
  sidebarTitle: "1-1 UCAT tutoring",
  sidebarSub: "UCAT experts · 14+ years experience",
} as const;

export const TUTORING_COPY = {
  linkText: "1-1 UCAT Tutoring",
  linkTextShort: "Learn more",
  footerCta: "Get 1-1 UCAT tutoring",
  ratedTrustpilot: "Rated 5.0 on Trustpilot (550+ reviews)",
  trustLine: "14+ years experience · UCAT experts · 550+ five-star Trustpilot reviews",
  expertLine: "UCAT Experts -",
  boostScore: "Want to boost your score? Our 1-1 UCAT tutoring is rated 5★",
  wantExpertTips: "Want expert tips?",
} as const;

export const COURSE_COPY = {
  eyebrow: "THEUKCATPEOPLE · LIVE UCAT COURSE",
  trustLine: "14+ years teaching · Dr Akash Gandhi · 550+ five-star Trustpilot reviews",
  badge: "LIVE COURSE",
  cta: "Buy tickets",
  hubStrip: "Master all 4 UCAT sections in one live day (£179)",
} as const;

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** UK (Europe/London) calendar YYYY-MM-DD for course day boundaries. */
const UK_TZ = "Europe/London";

function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** Sortable YYYYMMDD using UK local calendar date (not visitor timezone). */
export function ukCalendarOrdinal(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return y * 10000 + m * 100 + d;
}

function courseDateOrdinal(iso: string): number {
  const { y, m, d } = parseIsoDate(iso);
  return y * 10000 + m * 100 + d;
}

/**
 * Course upsells show through the event day (UK), then hide from the next UK calendar day.
 * e.g. June course through 28 Jun UK; July course through 12 Jul UK.
 */
export function isCourseStillActive(course: UcatOneDayCourse, now = new Date()): boolean {
  if (course.soldOut) return false;
  return ukCalendarOrdinal(now) <= courseDateOrdinal(course.date);
}

export function getActiveCourses(now = new Date()): UcatOneDayCourse[] {
  return UCAT_ONE_DAY_COURSES.filter((c) => isCourseStillActive(c, now));
}

/** Nearest upcoming active course; null after the last course day. */
export function getNextUpcomingCourse(now = new Date()): UcatOneDayCourse | null {
  const active = getActiveCourses(now);
  if (active.length === 0) return null;
  return active[0];
}

export function hasActiveCourseUpsells(now = new Date()): boolean {
  return getActiveCourses(now).length > 0;
}

/** Second active course when June is still live (for sidebar sublink). */
export function getSecondaryUpcomingCourse(now = new Date()): UcatOneDayCourse | null {
  const active = getActiveCourses(now);
  return active.length > 1 ? active[1] : null;
}

function shortCourseDate(c: UcatOneDayCourse): string {
  const parts = c.displayDate.split(" ");
  return `${parts[1]} ${parts[2]}`;
}

export function formatCourseDatesHint(now = new Date()): string | null {
  const active = getActiveCourses(now);
  if (active.length === 0) return null;
  if (active.length === 1) return shortCourseDate(active[0]);
  return `Next: ${shortCourseDate(active[0])} · Also ${shortCourseDate(active[1])}`;
}

export type PackageOffer = {
  label: string;
  href: string;
  headline: string;
  subline: string;
  cta: string;
  stream: Stream | null;
};

const GENERIC_PACKAGE_OFFER: PackageOffer = {
  label: "Packages",
  href: "https://www.theukcatpeople.co.uk/packages",
  headline: "Application packages",
  subline: "UCAT, interview, and personal statement support in one path",
  cta: "View packages",
  stream: null,
};

export function hasStreamSpecificPackage(
  stream: Stream | null | undefined,
): stream is "Medicine" | "Dentistry" | "Veterinary Medicine" {
  return (
    stream === "Medicine" || stream === "Dentistry" || stream === "Veterinary Medicine"
  );
}

/** First name from profile full_name for light personalisation. */
export function getProfileFirstName(fullName: string | null | undefined): string | null {
  if (!fullName?.trim()) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first || null;
}

export function personalizeUpsellText(
  firstName: string | null | undefined,
  message: string,
): string {
  const name = firstName?.trim();
  if (!name) return message;
  const rest = message.charAt(0).toLowerCase() + message.slice(1);
  return `${name}, ${rest}`;
}

type UpsellProfileInput = {
  full_name?: string | null;
  stream?: Stream | null;
  ucat_exam_date?: string | null;
};

type UpsellUserInput = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null;

export function getUpsellProfileContext(
  user: UpsellUserInput,
  profile: UpsellProfileInput | null | undefined,
) {
  const fullName =
    profile?.full_name?.trim() ||
    (typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    (typeof user?.user_metadata?.name === "string" ? user.user_metadata.name.trim() : "") ||
    null;

  return {
    firstName: user ? getProfileFirstName(fullName) : null,
    stream: profile?.stream ?? null,
    examDateIso: profile?.ucat_exam_date ?? null,
  };
}

export function getPackageForStream(stream: Stream | null): PackageOffer {
  if (!hasStreamSpecificPackage(stream)) {
    return { ...GENERIC_PACKAGE_OFFER };
  }

  const pkg = PACKAGE_LINKS.find((p) => p.stream === stream)!;
  const streamName =
    stream === "Dentistry"
      ? "Dentistry"
      : stream === "Veterinary Medicine"
        ? "Veterinary"
        : "Medicine";

  return {
    label: pkg.label,
    href: pkg.href,
    headline: `${streamName} ultimate package`,
    subline: `Your ${streamName.toLowerCase()} application package: UCAT, interview, and personal statement support`,
    cta: "View package",
    stream,
  };
}

export function getUpsellDismissKey(placement: UpsellPlacement, offerId: string): string {
  return `upsell_dismissed_${placement}_${offerId}`;
}

export function isUpsellDismissed(placement: UpsellPlacement, offerId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(getUpsellDismissKey(placement, offerId));
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export function dismissUpsell(placement: UpsellPlacement, offerId: string): void {
  try {
    localStorage.setItem(getUpsellDismissKey(placement, offerId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Exam date within N weeks (for course post-drill / mock scores). */
export function isExamWithinWeeks(examDateIso: string | null | undefined, weeks: number, now = new Date()): boolean {
  if (!examDateIso) return false;
  const { y, m, d } = parseIsoDate(examDateIso);
  if (!y || !m || !d) return false;
  const examDay = new Date(y, m - 1, d);
  if (Number.isNaN(examDay.getTime())) return false;
  const diffMs = examDay.getTime() - now.getTime();
  const diffWeeks = diffMs / (7 * 24 * 60 * 60 * 1000);
  return diffWeeks >= 0 && diffWeeks <= weeks;
}

export function getNextCourseUrl(now = new Date()): string | null {
  return getNextUpcomingCourse(now)?.href ?? null;
}

type SessionLike = { created_at: string; correct?: number; total?: number };

/** Show tutoring upsell on dashboard when practice is weak or stale. */
export function shouldShowDashboardTutoringUpsell(
  sessions: SessionLike[],
  now = new Date(),
): boolean {
  if (sessions.length === 0) return true;

  const last = sessions[sessions.length - 1];
  const lastMs = new Date(last.created_at).getTime();
  const daysSince = (now.getTime() - lastMs) / (24 * 60 * 60 * 1000);
  if (daysSince > 14) return true;

  const recent = sessions.slice(-10).filter((s) => (s.total ?? 0) > 0);
  if (recent.length === 0) return false;
  const avg =
    recent.reduce((sum, s) => sum + ((s.correct ?? 0) / (s.total ?? 1)) * 100, 0) / recent.length;
  return avg < 70;
}
