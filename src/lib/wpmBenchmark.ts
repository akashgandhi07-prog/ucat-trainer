/**
 * Benchmarks for "how you compare" vs other readers.
 * Most UCAT candidates read 250-350 WPM; 400+ is strong.
 */

export const WPM_BENCHMARK = {
  /** Typical range for most candidates (words per minute). */
  typicalMin: 250,
  typicalMax: 350,
  /** Strong reader threshold. */
  strongMin: 400,
  topMin: 450,
} as const;

export type WpmTier = "getting_started" | "building_speed" | "above_average" | "strong";

export function getWpmTier(wpm: number): WpmTier {
  if (wpm < 250) return "getting_started";
  if (wpm < 350) return "building_speed";
  if (wpm < 450) return "above_average";
  return "strong";
}

export function getWpmTierLabel(tier: WpmTier): string {
  switch (tier) {
    case "getting_started":
      return "Getting started";
    case "building_speed":
      return "Building speed";
    case "above_average":
      return "Above average";
    case "strong":
      return "Strong reader";
    default:
      return "-";
  }
}

export function getWpmComparisonCopy(wpm: number): string {
  const tier = getWpmTier(wpm);
  switch (tier) {
    case "getting_started":
      return "Most candidates read 250-350 WPM. Keep practising to build speed.";
    case "building_speed":
      return "You're in the typical range. Many users are here, keep going.";
    case "above_average":
      return "Faster than most candidates. Popular goal: 400+ WPM.";
    case "strong":
      return "You're in the top tier. Strong comprehension at speed.";
    default:
      return "Most UCAT candidates read 250-350 WPM.";
  }
}
