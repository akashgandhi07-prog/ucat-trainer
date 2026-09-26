import type { SkillTrainerKey } from "../../lib/skillTrainerProgress";

/** One sentence per trainer saying what the score measures, shown under the results heading. */
export const RESULTS_SUMMARY: Record<SkillTrainerKey, string> = {
  qr_setup: "Your score measures the setup decisions, not just the final answer.",
  qr_extraction: "Your score measures finding and combining the right values from the table, not just the final answer.",
  qr_estimation: "Your score measures your range and shortcut choices, not exact calculation.",
  dm_constraints: "A point is awarded for every puzzle solved without revealing the example arrangement.",
};
