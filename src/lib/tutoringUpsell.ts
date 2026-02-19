/**
 * Central config for UCAT tutoring upsell links and copy.
 * Single source of truth so URLs and wording stay consistent.
 */

export const UCAT_TUTORING_URL = "https://www.theukcatpeople.co.uk/ucat-tutoring";
export const TRUSTPILOT_URL = "https://www.trustpilot.com/review/www.theukcatpeople.co.uk";

/** High-value application packages (clean footer links, not salesy) */
export const PACKAGE_LINKS = [
  { label: "Medicine", href: "https://www.theukcatpeople.co.uk/packages" },
  { label: "Dentistry", href: "https://www.theukcatpeople.co.uk/dentistry-application-packages" },
  { label: "Veterinary", href: "https://www.theukcatpeople.co.uk/veterinary-medicine-ultimate-package" },
] as const;

export const TUTORING_COPY = {
  linkText: "1-1 UCAT Tutoring",
  linkTextShort: "Learn more",
  footerCta: "Get 1-1 UCAT tutoring",
  ratedTrustpilot: "Rated 5★ on Trustpilot",
  /** Single trust line for footer: no repetition of reviews/students elsewhere */
  trustLine: "10,000+ students taught · 14+ years experience. UCAT Experts.",
  /** Short line for inline/hub: sits next to 1-1 UCAT Tutoring link (no doctor/dentist here) */
  expertLine: "UCAT Experts —",
  boostScore: "Want to boost your score? Our 1-1 UCAT tutoring is rated 5★",
  wantExpertTips: "Want expert tips?",
} as const;
