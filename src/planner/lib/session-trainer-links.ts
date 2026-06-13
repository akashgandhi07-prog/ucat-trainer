/**
 * Maps planner session types to the SPA's trainer hub routes so the Today
 * view can deep-link straight into the relevant practice area.
 */

export interface TrainerLink {
  href: string
  label: string
}

const SECTION_HUBS = {
  vr: { href: '/ucat-verbal-reasoning-practice', label: 'Open Verbal Reasoning trainers' },
  dm: { href: '/ucat-decision-making-practice', label: 'Open Decision Making trainers' },
  qr: { href: '/ucat-quantitative-reasoning-practice', label: 'Open Quantitative Reasoning trainers' },
  sjt: { href: '/ucat-sjt-practice', label: 'Open SJT trainers' },
} as const

/**
 * Mini-mock notes are produced by miniMockNote() in
 * src/planner/embedded/lib/plan-engine.ts and look like "Mini VR Mock",
 * "Mini DM Mock", etc. Route to the matching section hub; default to VR.
 */
function miniMockLink(notes?: string | null): TrainerLink {
  const text = (notes ?? '').toUpperCase()
  if (text.includes('DM')) return SECTION_HUBS.dm
  if (text.includes('QR')) return SECTION_HUBS.qr
  if (text.includes('SJT')) return SECTION_HUBS.sjt
  return SECTION_HUBS.vr
}

/**
 * Returns the trainer deep link for a planner session, or null when there is
 * no internal trainer for it (full mocks are external; reflection/rest have
 * nothing to open).
 */
export function trainerLinkForSession(
  sessionType: string,
  notes?: string | null,
): TrainerLink | null {
  switch (sessionType) {
    case 'vr_practice':
      return SECTION_HUBS.vr
    case 'dm_practice':
      return SECTION_HUBS.dm
    case 'qr_practice':
      return SECTION_HUBS.qr
    case 'sjt_practice':
      return SECTION_HUBS.sjt
    case 'mini_mock':
      return miniMockLink(notes)
    default:
      return null
  }
}
