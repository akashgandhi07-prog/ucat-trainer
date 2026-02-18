import { z } from "zod";
import { validatePassword } from "./passwordValidation";
import type { AuthModalMode } from "../contexts/AuthModalContext";

const streamEnum = z.enum(["Medicine", "Dentistry", "Veterinary Medicine", "Other"]);

const baseAuthSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email.")
    .refine(
      (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()),
      "Please enter a valid email address."
    ),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  stream: streamEnum.optional(),
  entryYear: z.string().optional(),
});

export function getAuthSchema(mode: AuthModalMode) {
  return baseAuthSchema.superRefine((data, ctx) => {
    if (mode === "forgot") return;

    if (mode === "login") {
      if (!data.password?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter your password.",
          path: ["password"],
        });
      }
      return;
    }

    // register
    if (!data.firstName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First name is required.",
        path: ["firstName"],
      });
    }
    if (!data.lastName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Last name is required.",
        path: ["lastName"],
      });
    }
    if (!data.stream) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select your subject.",
        path: ["stream"],
      });
    }
    if (!data.entryYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select your entry year.",
        path: ["entryYear"],
      });
    }
    if (!data.password?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a password.",
        path: ["password"],
      });
    } else {
      const result = validatePassword(data.password);
      if (!result.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: result.message,
          path: ["password"],
        });
      }
    }
    if (data.password && data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });
}

export type AuthFormData = z.infer<typeof baseAuthSchema>;
