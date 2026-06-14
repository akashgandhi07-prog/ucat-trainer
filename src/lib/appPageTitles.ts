/** Human-readable title for the app top bar from the current route. */
export function getAppTopBarTitle(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/dashboard") return "My progress";
  if (pathname === "/admin") return "Admin";

  if (
    pathname === "/ucat-verbal-reasoning-practice" ||
    pathname.startsWith("/ucat-verbal-reasoning-") ||
    pathname.startsWith("/ucat-rapid-recall") ||
    pathname.startsWith("/ucat-keyword-scanning") ||
    pathname.startsWith("/ucat-inference")
  ) {
    return "Verbal Reasoning";
  }

  if (
    pathname === "/ucat-decision-making-practice" ||
    pathname.startsWith("/train/syllogism") ||
    pathname.startsWith("/ucat-syllogism") ||
    pathname.startsWith("/ucat-venn-logic") ||
    pathname.startsWith("/ucat-data-logic") ||
    pathname.startsWith("/ucat-argument-judge")
  ) {
    return "Decision Making";
  }

  if (
    pathname === "/ucat-quantitative-reasoning-practice" ||
    pathname.startsWith("/ucat-calculator-trainer") ||
    pathname.startsWith("/train/mentalMaths") ||
    pathname.startsWith("/ucat-mental-maths")
  ) {
    return "Quantitative Reasoning";
  }

  if (pathname.startsWith("/study-plan")) return "Study plan";
  if (pathname.startsWith("/mock-scores")) return "Mock scores";
  if (pathname.startsWith("/tutor")) return "Tutor dashboard";

  return "UCAT Skills Trainer";
}
