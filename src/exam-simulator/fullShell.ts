import type { Bank, Question } from "./model";
import { bankSchema } from "./model";
import { sample } from "./sample";

const sectionSizes = { VR: 44, DM: 35, QR: 36, SJT: 69 } as const;

function placeholder(
  sectionId: keyof typeof sectionSizes,
  number: number,
): Question {
  return {
    id: `${sectionId.toLowerCase()}-${number}`,
    type: "choice",
    layout: sectionId === "VR" || sectionId === "SJT" ? "split" : "full",
    passage:
      sectionId === "VR"
        ? `Placeholder passage for Verbal Reasoning question ${number}. Replace this text when loading your question bank.`
        : sectionId === "SJT"
          ? `Placeholder scenario for Situational Judgement question ${number}. Replace this text when loading your question bank.`
          : undefined,
    prompt: `Placeholder ${sectionId} question ${number}. Replace this question before using the bank with students.`,
    options: ["Option A", "Option B", "Option C", "Option D"].map(
      (text, index) => ({ id: String.fromCharCode(65 + index), text }),
    ),
  };
}

export const fullShell: Bank = bankSchema.parse({
  title: "Full-length UCAT Shell",
  sections: sample.sections.map((source) => {
    const size = sectionSizes[source.id];
    const examples = source.questions.map((question, index) => ({
      ...question,
      id: `${source.id.toLowerCase()}-${index + 1}`,
    }));
    const questions = Array.from({ length: size }, (_, index) => {
      const number = index + 1;
      return examples[index] ?? placeholder(source.id, number);
    });
    return {
      id: source.id,
      name: source.name,
      durationSeconds: source.durationSeconds,
      instructionSeconds: 90,
      questions,
    };
  }),
});
