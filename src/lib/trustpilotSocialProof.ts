/**
 * Curated Trustpilot quotes by product (from verified public reviews).
 * Stats: https://www.trustpilot.com/review/www.theukcatpeople.co.uk
 */

import type { UpsellOffer } from "./productUpsell";

export const TRUSTPILOT_STATS = {
  score: "5.0",
  reviewCount: 550,
  label: "550+ reviews",
  ratedLabel: "Rated 5.0 on Trustpilot",
  shortRated: "Rated 5★ on Trustpilot",
} as const;

export type TrustpilotSnippet = {
  quote: string;
  author: string;
  /** e.g. "Mar 2026". Not a performance claim. */
  dateLabel?: string;
};

/** One rotating quote per offer; all verbatim or lightly trimmed from Trustpilot. */
export const TRUSTPILOT_SNIPPETS: Record<UpsellOffer, TrustpilotSnippet> = {
  course: {
    quote: "Would highly recommend their UCAT one-day course.",
    author: "Zain S.",
    dateLabel: "Mar 2026",
  },
  tutoring: {
    quote:
      "I would recommend the UKCAT people to anyone needing help with their UCAT exam or preparing for medicine interviews.",
    author: "Joshua",
    dateLabel: "Mar 2026",
  },
  package: {
    quote:
      "They guided me through every single step: UCAT tutor, personal statement, and interview prep.",
    author: "Sofia P.",
    dateLabel: "Apr 2026",
  },
};

export function formatTrustpilotQuote(snippet: TrustpilotSnippet): string {
  const tail = snippet.dateLabel ? ` · ${snippet.dateLabel}` : "";
  return `"${snippet.quote}" · ${snippet.author}${tail}`;
}

export function getTrustpilotSnippet(offer: UpsellOffer): TrustpilotSnippet {
  return TRUSTPILOT_SNIPPETS[offer];
}

/** Curated quotes for the home landing reviews grid (verbatim from public Trustpilot reviews). */
export const LANDING_TRUSTPILOT_REVIEWS: readonly TrustpilotSnippet[] = [
  TRUSTPILOT_SNIPPETS.course,
  TRUSTPILOT_SNIPPETS.tutoring,
  TRUSTPILOT_SNIPPETS.package,
];
