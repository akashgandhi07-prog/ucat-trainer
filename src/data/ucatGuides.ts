import type { TrainingType } from "../types/training";

const SITE = "https://www.theukcatpeople.co.uk";

export type UcatGuide = {
  id: string;
  title: string;
  href: string;
};

export type UcatGuideContext =
  | "home"
  | "verbalHub"
  | "decisionHub"
  | "quantHub"
  | "sjtHub"
  | "application";

export type UcatGuidesPanelContext = UcatGuideContext | "trainer" | "studyGuides";

function guide(id: string, title: string, path: string): UcatGuide {
  return { id, title, href: `${SITE}${path}` };
}

/** Wix UCAT guides. Add new slugs here as you publish more. */
export const UCAT_GUIDES = {
  whatIsUcat: guide("what-is-ucat", "What is the UCAT?", "/ucat-guides/ucat-what-is-the-ucat"),
  vrComplete: guide(
    "vr-complete",
    "Verbal Reasoning: complete guide",
    "/ucat-guides/ucat-verbal-reasoning-complete-guide",
  ),
  vrTrueFalse: guide(
    "vr-true-false",
    "True / False / Can't Tell strategy",
    "/ucat-guides/ucat-verbal-reasoning-true-false-cant-tell-strategy",
  ),
  vrInference: guide(
    "vr-inference",
    "Inference questions guide",
    "/ucat-guides/ucat-verbal-reasoning-inference-questions-guide",
  ),
  vrKeywordScanning: guide(
    "vr-keyword-scanning",
    "Keyword scanning technique",
    "/ucat-guides/ucat-verbal-reasoning-keyword-scanning-technique",
  ),
  vrSkimming: guide(
    "vr-skimming",
    "Speed reading, skimming & scanning",
    "/ucat-guides/ucat-verbal-reasoning-speed-reading-skimming-scanning",
  ),
  vrCommonTraps: guide(
    "vr-traps",
    "Common VR traps and how to avoid them",
    "/ucat-guides/ucat-verbal-reasoning-common-traps-how-to-avoid",
  ),
  vrMultipleChoice: guide(
    "vr-multiple-choice",
    "Multiple choice: best answer questions",
    "/ucat-guides/ucat-verbal-reasoning-multiple-choice-best-answer-questions",
  ),
  vrAuthorOpinion: guide(
    "vr-author-opinion",
    "Author opinion and tone questions",
    "/ucat-guides/ucat-verbal-reasoning-author-opinion-tone-questions",
  ),
  vrNegativeExcept: guide(
    "vr-negative-except",
    "Negative questions: NOT, EXCEPT and LEAST",
    "/ucat-guides/ucat-verbal-reasoning-negative-questions-not-except-least",
  ),
  dmComplete: guide(
    "dm-complete",
    "Decision Making: complete guide",
    "/ucat-guides/ucat-decision-making-section-complete-guide",
  ),
  dmSyllogisms: guide(
    "dm-syllogisms",
    "Syllogisms guide with worked examples",
    "/ucat-guides/ucat-decision-making-syllogisms-guide-worked-examples",
  ),
  dmLogicalPuzzles: guide(
    "dm-puzzles",
    "Logical puzzles: basics overview",
    "/ucat-guides/ucat-decision-making-logical-puzzles-basics-overview",
  ),
  dmLogicalPuzzlesTasks: guide(
    "dm-puzzles-tasks",
    "Logical puzzles: tasks and deductions",
    "/ucat-guides/ucat-decision-making-logical-puzzles-tasks-deductions",
  ),
  dmStrongestArgument: guide(
    "dm-strongest-argument",
    "Strongest argument questions",
    "/ucat-guides/ucat-decision-making-strongest-argument-questions",
  ),
  qrComplete: guide(
    "qr-complete",
    "Quantitative Reasoning: complete guide",
    "/ucat-guides/ucat-quantitative-reasoning-complete-guide",
  ),
  qrCalculator: guide(
    "qr-calculator",
    "On-screen calculator & keyboard shortcuts",
    "/ucat-guides/ucat-on-screen-calculator-guide-keyboard-shortcuts",
  ),
  qrPercentages: guide(
    "qr-percentages",
    "Percentage questions & shortcuts",
    "/ucat-guides/ucat-quantitative-reasoning-percentage-questions-shortcuts",
  ),
  qrRatios: guide(
    "qr-ratios",
    "Ratio & proportion questions",
    "/ucat-guides/ucat-quantitative-reasoning-ratio-proportion-questions",
  ),
  qrGeometry: guide(
    "qr-geometry",
    "Geometry questions",
    "/ucat-guides/ucat-quantitative-reasoning-geometry-questions",
  ),
  qrTaxFinancial: guide(
    "qr-tax-financial",
    "Tax and financial maths",
    "/ucat-guides/ucat-quantitative-reasoning-tax-financial-maths",
  ),
  timings: guide(
    "timings",
    "UCAT timings by section",
    "/ucat-guides/ucat-timings-sections-question-seconds",
  ),
  goodScore: guide(
    "good-score",
    "Good UCAT scores, averages & deciles",
    "/ucat-guides/ucat-good-score-average-deciles",
  ),
  timePressure: guide(
    "time-pressure",
    "Managing UCAT time pressure",
    "/ucat-guides/ucat-time-pressure",
  ),
  noteboardGuide: guide(
    "noteboard",
    "UCAT noteboard: what to write and how to use it",
    "/ucat-guides/ucat-noteboard-what-to-write-how-to-use",
  ),
  testDayExpect: guide(
    "test-day",
    "UCAT test day: what to expect",
    "/ucat-guides/ucat-test-day-what-to-expect",
  ),
  canResitUcat: guide(
    "can-resit-ucat",
    "Can you resit the UCAT?",
    "/ucat-guides/can-you-resit-the-ucat",
  ),
  retakeImproveScore: guide(
    "retake-improve-score",
    "UCAT retake: how to improve your score",
    "/ucat-guides/ucat-retake-how-to-improve-your-score",
  ),
  retakeReapplicant: guide(
    "retake-reapplicant",
    "UCAT retake: improve your score as a reapplicant",
    "/ucat-guides/ucat-retake-improve-score-reapplicant",
  ),
  parentsGuide: guide(
    "parents-guide",
    "Parents' guide: supporting your child with the UCAT",
    "/ucat-guides/parents-guide-ucat-support-child",
  ),
  sjtComplete: guide(
    "sjt-complete",
    "Situational Judgement: complete guide",
    "/ucat-guides/ucat-situational-judgement-sjt-section-complete-guide",
  ),
  sjtMostLeast: guide(
    "sjt-most-least",
    "Most and least appropriate questions",
    "/ucat-guides/ucat-sjt-most-and-least-appropriate-questions",
  ),
  sjtGmcGmp: guide(
    "sjt-gmc-gmp",
    "GMC Good Medical Practice and Band 1",
    "/ucat-guides/ucat-sjt-gmc-good-medical-practice-band-1",
  ),
  sjtBandsUnis: guide(
    "sjt-bands-unis",
    "SJT Bands 1 to 4: meaning for universities",
    "/ucat-guides/ucat-sjt-band-1-2-3-4-meaning-universities",
  ),
} as const;

export const UCAT_APPLICATION_LINKS = {
  scoreCalculator: guide(
    "score-calculator",
    "UCAT score calculator",
    "/application-guide/ucat/ucat-score-calculator",
  ),
  universityCutoffs: guide(
    "uni-cutoffs",
    "How universities use the UCAT",
    "/medical-schools/ucat/how-universities-use-the-ucat",
  ),
} as const;

export const UCAT_GUIDES_HUB_URL = `${SITE}/ucat-guides`;

export type UcatGuideCatalogSection = {
  id: string;
  title: string;
  summary: string;
  guides: UcatGuide[];
};

/** Full public guide library, grouped for the accordion panel on hub and trainer pages. */
export const UCAT_GUIDE_CATALOG: UcatGuideCatalogSection[] = [
  {
    id: "essentials",
    title: "UCAT essentials",
    summary: "Overview, timings, scores, test day and retakes",
    guides: [
      UCAT_GUIDES.whatIsUcat,
      UCAT_GUIDES.timings,
      UCAT_GUIDES.goodScore,
      UCAT_GUIDES.timePressure,
      UCAT_GUIDES.testDayExpect,
      UCAT_GUIDES.noteboardGuide,
      UCAT_GUIDES.canResitUcat,
      UCAT_GUIDES.retakeImproveScore,
      UCAT_GUIDES.retakeReapplicant,
      UCAT_GUIDES.parentsGuide,
    ],
  },
  {
    id: "verbal",
    title: "Verbal Reasoning",
    summary: "Complete VR playbook and tactics",
    guides: [
      UCAT_GUIDES.vrComplete,
      UCAT_GUIDES.vrSkimming,
      UCAT_GUIDES.vrKeywordScanning,
      UCAT_GUIDES.vrTrueFalse,
      UCAT_GUIDES.vrMultipleChoice,
      UCAT_GUIDES.vrInference,
      UCAT_GUIDES.vrAuthorOpinion,
      UCAT_GUIDES.vrNegativeExcept,
      UCAT_GUIDES.vrCommonTraps,
    ],
  },
  {
    id: "decision",
    title: "Decision Making",
    summary: "DM section, syllogisms, puzzles and arguments",
    guides: [
      UCAT_GUIDES.dmComplete,
      UCAT_GUIDES.dmSyllogisms,
      UCAT_GUIDES.dmLogicalPuzzles,
      UCAT_GUIDES.dmLogicalPuzzlesTasks,
      UCAT_GUIDES.dmStrongestArgument,
    ],
  },
  {
    id: "quant",
    title: "Quantitative Reasoning",
    summary: "QR section, calculator and number skills",
    guides: [
      UCAT_GUIDES.qrComplete,
      UCAT_GUIDES.qrCalculator,
      UCAT_GUIDES.qrPercentages,
      UCAT_GUIDES.qrRatios,
      UCAT_GUIDES.qrGeometry,
      UCAT_GUIDES.qrTaxFinancial,
    ],
  },
  {
    id: "sjt",
    title: "Situational Judgement",
    summary: "SJT format, GMC guidance and banding",
    guides: [
      UCAT_GUIDES.sjtComplete,
      UCAT_GUIDES.sjtMostLeast,
      UCAT_GUIDES.sjtGmcGmp,
      UCAT_GUIDES.sjtBandsUnis,
    ],
  },
  {
    id: "application",
    title: "Application and universities",
    summary: "Score tools and how unis use UCAT",
    guides: [UCAT_APPLICATION_LINKS.scoreCalculator, UCAT_APPLICATION_LINKS.universityCutoffs],
  },
];

/**
 * Sections for the accordion: the page's focal section first, then every other catalogue block
 * in the default library order without duplicating the priority block.
 */
export function getOrderedGuideCatalogSections(options: {
  context?: UcatGuidesPanelContext;
  trainingType?: TrainingType;
}): UcatGuideCatalogSection[] {
  const priorityId =
    options.context === "trainer" && options.trainingType
      ? getCatalogSectionIdForTrainingType(options.trainingType)
      : getCatalogSectionIdForPanelContext(options.context);

  const prioritySection = UCAT_GUIDE_CATALOG.find((s) => s.id === priorityId);
  if (!prioritySection) return [...UCAT_GUIDE_CATALOG];

  const rest = UCAT_GUIDE_CATALOG.filter((s) => s.id !== priorityId);
  return [prioritySection, ...rest];
}

/** Which accordion section opens first for each panel context (non-trainer pages). */
export function getCatalogSectionIdForPanelContext(context?: UcatGuidesPanelContext): string {
  switch (context) {
    case "verbalHub":
      return "verbal";
    case "decisionHub":
      return "decision";
    case "quantHub":
      return "quant";
    case "sjtHub":
      return "sjt";
    case "application":
      return "application";
    case "home":
    case "studyGuides":
      return "essentials";
    case "trainer":
    default:
      return "essentials";
  }
}

export function getCatalogSectionIdForTrainingType(type: TrainingType): string {
  switch (type) {
    case "calculator":
    case "mental_maths":
      return "quant";
    case "speed_reading":
    case "rapid_recall":
    case "keyword_scanning":
    case "inference_trainer":
      return "verbal";
    default:
      return "essentials";
  }
}

const GUIDES_BY_TRAINING_TYPE: Partial<Record<TrainingType, UcatGuide[]>> = {
  speed_reading: [UCAT_GUIDES.vrSkimming, UCAT_GUIDES.vrTrueFalse],
  rapid_recall: [UCAT_GUIDES.vrCommonTraps, UCAT_GUIDES.vrSkimming],
  keyword_scanning: [UCAT_GUIDES.vrKeywordScanning],
  inference_trainer: [UCAT_GUIDES.vrInference, UCAT_GUIDES.vrTrueFalse],
  calculator: [UCAT_GUIDES.qrCalculator],
  mental_maths: [UCAT_GUIDES.qrPercentages, UCAT_GUIDES.qrRatios],
};

const CONTEXT_GUIDES: Record<UcatGuideContext, UcatGuide[]> = {
  home: [
    UCAT_GUIDES.whatIsUcat,
    UCAT_GUIDES.timings,
    UCAT_GUIDES.goodScore,
    UCAT_APPLICATION_LINKS.scoreCalculator,
    UCAT_APPLICATION_LINKS.universityCutoffs,
  ],
  verbalHub: [UCAT_GUIDES.vrComplete, UCAT_GUIDES.vrTrueFalse, UCAT_GUIDES.timePressure],
  decisionHub: [
    UCAT_GUIDES.dmComplete,
    UCAT_GUIDES.dmSyllogisms,
    UCAT_GUIDES.dmLogicalPuzzles,
  ],
  quantHub: [
    UCAT_GUIDES.qrComplete,
    UCAT_GUIDES.qrCalculator,
    UCAT_GUIDES.qrPercentages,
    UCAT_APPLICATION_LINKS.scoreCalculator,
  ],
  sjtHub: [
    UCAT_GUIDES.sjtComplete,
    UCAT_GUIDES.sjtMostLeast,
    UCAT_GUIDES.sjtGmcGmp,
    UCAT_GUIDES.sjtBandsUnis,
  ],
  application: [
    UCAT_APPLICATION_LINKS.scoreCalculator,
    UCAT_APPLICATION_LINKS.universityCutoffs,
    UCAT_GUIDES.goodScore,
  ],
};

export function getGuidesForContext(context: UcatGuideContext): UcatGuide[] {
  return CONTEXT_GUIDES[context];
}

export function mergeGuides(...lists: UcatGuide[][]): UcatGuide[] {
  const seen = new Set<string>();
  const out: UcatGuide[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/** Hub pages: section staples plus guides matched to the active trainer skill. */
export function getVerbalHubGuides(activeSkill?: TrainingType): UcatGuide[] {
  const staples = CONTEXT_GUIDES.verbalHub;
  if (!activeSkill) return staples;
  const skillGuides = GUIDES_BY_TRAINING_TYPE[activeSkill] ?? [];
  const seen = new Set<string>();
  return [...staples, ...skillGuides].filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

export function getGuidesForTrainingType(type: TrainingType): UcatGuide[] {
  return GUIDES_BY_TRAINING_TYPE[type] ?? [];
}

export function getSyllogismGuides(): UcatGuide[] {
  return [UCAT_GUIDES.dmSyllogisms, UCAT_GUIDES.dmLogicalPuzzles, UCAT_GUIDES.dmComplete];
}

export const UCAT_GUIDES_YEAR = 2026;

export const UCAT_GUIDES_MARKETING = {
  badge: `New for ${UCAT_GUIDES_YEAR}`,
  defaultTitle: `Fresh UCAT guides for ${UCAT_GUIDES_YEAR}`,
  defaultDescription:
    "Brand-new written guides from The UKCAT People: strategies, worked examples, and tactics updated for this year's UCAT cycle. Free to read, built to pair with these trainers.",
  linkCta: "Read free guide",
  footerCta: `Browse all ${UCAT_GUIDES_YEAR} guides`,
} as const;

const PANEL_COPY: Record<UcatGuidesPanelContext, { title: string; description: string }> = {
  studyGuides: {
    title: `UCAT study guides · ${UCAT_GUIDES_YEAR}`,
    description:
      "The same library as elsewhere on this site: open a section below for essentials, Verbal Reasoning, Decision Making, Quantitative Reasoning, SJT and application. Each tile opens our free guide on The UKCAT People in a new tab.",
  },
  home: {
    title: `New UCAT resource library · ${UCAT_GUIDES_YEAR}`,
    description:
      "Expand a section to browse every free guide: Verbal Reasoning, Decision Making, Quantitative Reasoning, Situational Judgement, test essentials and how universities use scores. Then drill the matching trainer on this site.",
  },
  verbalHub: {
    title: `New Verbal Reasoning guides · ${UCAT_GUIDES_YEAR}`,
    description:
      "Every free 2026 guide is below in one library. Verbal Reasoning opens first on this page. Expand Decision Making, Quantitative Reasoning, SJT, essentials or application for the full set.",
  },
  decisionHub: {
    title: `New Decision Making guides · ${UCAT_GUIDES_YEAR}`,
    description:
      "Every free 2026 guide is below in one library. Decision Making opens first on this page. Expand Verbal Reasoning, Quantitative Reasoning, SJT, essentials or application for the full set.",
  },
  quantHub: {
    title: `New Quantitative Reasoning guides · ${UCAT_GUIDES_YEAR}`,
    description:
      "Every free 2026 guide is below in one library. Quantitative Reasoning opens first on this page. Expand Verbal Reasoning, Decision Making, SJT, essentials or application for the full set.",
  },
  sjtHub: {
    title: `New SJT guides · ${UCAT_GUIDES_YEAR}`,
    description:
      "Every free 2026 guide is below in one library. Situational Judgement opens first on this page. Expand Verbal Reasoning, Decision Making, Quantitative Reasoning, essentials or application for the full set.",
  },
  application: {
    title: `UCAT scoring & universities · ${UCAT_GUIDES_YEAR}`,
    description:
      "Below is the full free guide library. Application and universities opens first on this page for the score calculator and how unis use UCAT. Expand any other section for VR, DM, QR, SJT and essentials.",
  },
  trainer: {
    title: `Go deeper · new ${UCAT_GUIDES_YEAR} guides`,
    description:
      "The full free library is below. Expand any section for VR, DM, QR, SJT, essentials and application guides, then come back here to drill until it sticks.",
  },
};

export function getGuidesPanelCopy(context?: UcatGuidesPanelContext): {
  title: string;
  description: string;
} {
  if (context && PANEL_COPY[context]) return PANEL_COPY[context];
  return {
    title: UCAT_GUIDES_MARKETING.defaultTitle,
    description: UCAT_GUIDES_MARKETING.defaultDescription,
  };
}
