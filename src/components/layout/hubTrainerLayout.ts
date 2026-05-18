/** Shared copy and layout for skills hub trainer grids (VR, DM, QR, SJT). */
export const HUB_SKILLS_TRAINERS_TITLE = "Skills trainers";

export function hubTrainerGridClass(trainerCount: number): string {
  const base = "grid w-full gap-4";
  if (trainerCount >= 4) {
    return `${base} grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`;
  }
  if (trainerCount === 3) {
    return `${base} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
  }
  if (trainerCount === 2) {
    return `${base} grid-cols-1 sm:grid-cols-2`;
  }
  return `${base} grid-cols-1`;
}
