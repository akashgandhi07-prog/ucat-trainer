import { z } from "zod";

const DESCRIPTION_MAX = 3000;
const PAGE_URL_MAX = 255;

export const feedbackSchema = z.object({
  feedbackType: z.enum(["bug", "suggestion"]),
  description: z
    .string()
    .min(1, "Please describe your feedback.")
    .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer.`),
  pageUrl: z
    .string()
    .max(PAGE_URL_MAX, `Page URL must be ${PAGE_URL_MAX} characters or fewer.`)
    .optional(),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;
