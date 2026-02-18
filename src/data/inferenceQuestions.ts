import type { InferenceQuestion, TextSpan } from "../types/inference";

/** Helper: find character span for a substring in passage text. Returns null if not found. */
function spanFor(passageText: string, substring: string): TextSpan | null {
  const idx = passageText.indexOf(substring);
  if (idx === -1) return null;
  return { start: idx, end: idx + substring.length };
}

/**
 * Build questions for a passage. Call with passage.text to get spans.
 * Important: each question uses an exact substring match (spanFor). If passage text in
 * passages.ts is edited, the corresponding substring in this file must match exactly,
 * or that question will be omitted at runtime.
 */
function buildQuestionsForPassage(passageId: string, text: string): InferenceQuestion[] {
  const questions: InferenceQuestion[] = [];

  // pass_01: Autonomy in Geriatric Care
  if (passageId === "pass_01") {
    const q1 = spanFor(
      text,
      "The legal framework in the United Kingdom requires that every effort is made to support decision making before capacity is deemed absent."
    );
    if (q1) {
      questions.push({
        id: "inf_01_q1",
        passageId: "pass_01",
        questionText:
          "Identify the part of the text from which we can infer that UK law requires supporting patient decision-making before declaring incapacity.",
        correctSpans: [q1],
        explanation:
          "This sentence states that the UK legal framework requires every effort to support decision making before capacity is deemed absent—directly answering the question.",
        difficulty: "medium",
      });
    }

    const q2 = spanFor(
      text,
      "Some ethicists argue that soft paternalism is necessary in cases of fluctuating capacity while others maintain that autonomy allows for choices that seem irrational to observers."
    );
    if (q2) {
      questions.push({
        id: "inf_01_q2",
        passageId: "pass_01",
        questionText:
          "Identify the part of the text from which we can infer that there is disagreement among ethicists about when to override a patient's choices.",
        correctSpans: [q2],
        explanation:
          "The passage presents two opposing views: one arguing for soft paternalism in fluctuating capacity, the other that autonomy permits seemingly irrational choices.",
        difficulty: "medium",
      });
    }
  }

  // pass_02: Bronze Age Collapse
  if (passageId === "pass_02") {
    const q1 = spanFor(
      text,
      "It is now widely believed that a combination of environmental disaster disrupted trade and warfare created a domino effect."
    );
    if (q1) {
      questions.push({
        id: "inf_02_q1",
        passageId: "pass_02",
        questionText:
          "Identify the part of the text from which we can infer that historians no longer attribute the Bronze Age collapse to a single cause.",
        correctSpans: [q1],
        explanation:
          "The phrase 'a combination of environmental disaster disrupted trade and warfare' indicates multiple factors, not a single explanation.",
        difficulty: "easy",
      });
    }

    const q2 = spanFor(
      text,
      "Climate data indicates that a series of severe droughts occurred simultaneously which would have decimated agricultural output."
    );
    if (q2) {
      questions.push({
        id: "inf_02_q2",
        passageId: "pass_02",
        questionText:
          "Identify the part of the text from which we can infer that environmental factors contributed to the Bronze Age collapse.",
        correctSpans: [q2],
        explanation:
          "This sentence directly links severe droughts to decimated agricultural output, an environmental contribution to societal breakdown.",
        difficulty: "easy",
      });
    }
  }

  // pass_03: Antibiotic Resistance
  if (passageId === "pass_03") {
    const q1 = spanFor(
      text,
      "The overuse of antibiotics in agriculture and human medicine has undoubtedly accelerated this process."
    );
    if (q1) {
      questions.push({
        id: "inf_03_q1",
        passageId: "pass_03",
        questionText:
          "Identify the part of the text from which we can infer that human behaviour has made antibiotic resistance worse.",
        correctSpans: [q1],
        explanation:
          "Overuse in agriculture and medicine is human behaviour that has accelerated the development of resistance.",
        difficulty: "easy",
      });
    }

    const q2 = spanFor(
      text,
      "Scientists argue that strict stewardship programs must be implemented globally to preserve existing drugs."
    );
    if (q2) {
      questions.push({
        id: "inf_03_q2",
        passageId: "pass_03",
        questionText:
          "Identify the part of the text from which we can infer that experts believe coordinated action is needed to combat resistance.",
        correctSpans: [q2],
        explanation:
          "Strict stewardship programs implemented globally implies coordinated, international action is necessary.",
        difficulty: "medium",
      });
    }
  }

  // pass_04: Utilitarianism and Triage
  if (passageId === "pass_04") {
    const q1 = spanFor(
      text,
      "Those who are likely to survive without immediate care and those who are unlikely to survive even with maximal care are prioritised lower than those for whom immediate intervention will make the difference between life and death."
    );
    if (q1) {
      questions.push({
        id: "inf_04_q1",
        passageId: "pass_04",
        questionText:
          "Identify the part of the text from which we can infer how triage systems decide who receives treatment first.",
        correctSpans: [q1],
        explanation:
          "This sentence explains the prioritisation logic: patients for whom immediate care makes a difference are prioritised over those who will survive without it or those who will not survive regardless.",
        difficulty: "medium",
      });
    }
  }

  // pass_06: Confidentiality in Adolescence
  if (passageId === "pass_06") {
    const q1 = spanFor(
      text,
      "If a clinician believes that a young patient is being abused or is in danger of serious injury they must breach confidentiality to protect the child."
    );
    if (q1) {
      questions.push({
        id: "inf_06_q1",
        passageId: "pass_06",
        questionText:
          "Identify the part of the text from which we can infer that confidentiality for minors is not absolute.",
        correctSpans: [q1],
        explanation:
          "The obligation to breach confidentiality when abuse or serious harm is suspected shows that confidentiality has limits.",
        difficulty: "medium",
      });
    }
  }

  return questions;
}

/** All inference questions, keyed by passage ID. Build at runtime from passage text. */
export function getInferenceQuestionsForPassage(
  passageId: string,
  passageText: string
): InferenceQuestion[] {
  return buildQuestionsForPassage(passageId, passageText);
}

/** Passage IDs that have inference questions. */
export const PASSAGE_IDS_WITH_INFERENCE: string[] = [
  "pass_01",
  "pass_02",
  "pass_03",
  "pass_04",
  "pass_06",
];
