import { z } from "zod";
const option = z.object({ id: z.string().min(1), text: z.string().min(1) });
const editorial = z.object({
  status: z.enum(["draft", "in-review", "approved", "changes-requested"]),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  tags: z.array(z.string().min(1)).max(20).default([]),
  author: z.string().optional(),
  reviewer: z.string().optional(),
  notes: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
});
const question = z
  .object({
    id: z.string().min(1),
    type: z.enum(["choice", "yes-no", "most-least"]),
    passage: z.string().optional(),
    prompt: z.string().min(1),
    layout: z.enum(["split", "full"]).default("full"),
    options: z.array(option).min(2).max(8).optional(),
    statements: z.array(z.string().min(1)).length(5).optional(),
    table: z
      .object({
        headers: z.array(z.string()).min(1),
        rows: z.array(z.array(z.string())),
      })
      .optional(),
    image: z
      .string()
      .regex(/^data:image\/(png|jpeg|webp);base64,/)
      .optional(),
    correctAnswer: z.record(z.string(), z.string()).optional(),
    explanation: z.string().optional(),
    editorial: editorial.optional(),
  })
  .superRefine((q, c) => {
    if (q.type === "yes-no" && !q.statements)
      c.addIssue({
        code: "custom",
        message: "Yes/no questions need five statements.",
      });
    if (q.type !== "yes-no" && !q.options)
      c.addIssue({
        code: "custom",
        message: "Choice and most/least questions need options.",
      });
    if (
      q.options &&
      new Set(q.options.map((o) => o.id)).size !== q.options.length
    )
      c.addIssue({ code: "custom", message: "Option IDs must be unique." });
    if (q.table?.rows.some((r) => r.length !== q.table!.headers.length))
      c.addIssue({ code: "custom", message: "Table rows must match headers." });
    if (q.correctAnswer && !complete(q, q.correctAnswer))
      c.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: "Correct answer must be complete for this question type.",
      });
    const optionIds = new Set(q.options?.map((o) => o.id) ?? []);
    if (
      q.correctAnswer &&
      q.type !== "yes-no" &&
      Object.values(q.correctAnswer).some((value) => !optionIds.has(value))
    )
      c.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: "Correct answers must reference an existing option ID.",
      });
    if (q.editorial?.status === "approved" && !q.correctAnswer)
      c.addIssue({
        code: "custom",
        path: ["correctAnswer"],
        message: "Approved questions need a correct answer.",
      });
    if (q.editorial?.status === "approved" && !q.explanation?.trim())
      c.addIssue({
        code: "custom",
        path: ["explanation"],
        message: "Approved questions need an explanation.",
      });
  });
export const bankSchema = z
  .object({
    title: z.string().min(1),
    sections: z
      .array(
        z.object({
          id: z.enum(["VR", "DM", "QR", "SJT"]),
          name: z.string().min(1),
          durationSeconds: z.number().int().positive().max(14400),
          instructionSeconds: z.number().int().positive().max(600).default(90),
          questions: z.array(question).min(1).max(100),
        }),
      )
      .min(1)
      .max(4),
  })
  .superRefine((b, c) => {
    if (new Set(b.sections.map((s) => s.id)).size !== b.sections.length)
      c.addIssue({ code: "custom", message: "Section IDs must be unique." });
    const ids = b.sections.flatMap((s) => s.questions.map((q) => q.id));
    if (new Set(ids).size !== ids.length)
      c.addIssue({
        code: "custom",
        message: "Question IDs must be unique across the bank.",
      });
  });
export type Bank = z.infer<typeof bankSchema>;
export type Question = Bank["sections"][number]["questions"][number];
export type Answer = Record<string, string>;
export type ExamShortcut =
  | "next"
  | "previous"
  | "flag"
  | "navigator"
  | "calculator"
  | "help"
  | "end-review"
  | "review-all";
const shortcuts: Record<string, ExamShortcut> = {
  n: "next",
  p: "previous",
  f: "flag",
  v: "navigator",
  c: "calculator",
  h: "help",
  e: "end-review",
  a: "review-all",
};
export function examShortcut(event: {
  key: string;
  altKey: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
}): ExamShortcut | null {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat)
    return null;
  return shortcuts[event.key.toLowerCase()] ?? null;
}
export function complete(q: Question, a: Answer = {}) {
  if (q.type === "yes-no")
    return (
      !!q.statements?.length &&
      q.statements.every((_, i) => ["Yes", "No"].includes(a[String(i)]))
    );
  if (q.type === "most-least")
    return !!q.options?.length && !!a.most && !!a.least && a.most !== a.least;
  return !!a.choice;
}
export function assign(
  a: Answer,
  slot: string,
  value: string,
  unique: boolean,
): Answer {
  return {
    ...Object.fromEntries(
      Object.entries(a).filter(
        ([k, v]) => k !== slot && (!unique || v !== value),
      ),
    ),
    [slot]: value,
  };
}
