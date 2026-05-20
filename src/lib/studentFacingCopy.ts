/** Normalise AI output to UKCAT People copy rules (no em/en dash, readable line breaks). */

const EM_DASH = "\u2014";
const EN_DASH = "\u2013";

export function sanitizeStudentFacingCopy(text: string): string {
  if (!text) return text;

  let out = text.replace(/\r\n/g, "\n");

  out = out.replace(/Step\s+(\d+)\s*[—–:]\s*/gi, "Step $1:\n\n");
  out = out.replace(/[—–]/g, ", ");
  out = out.replace(/, ,/g, ", ").replace(/\n{3,}/g, "\n\n");

  return ensureExplanationLineBreaks(out.trim());
}

export function ensureExplanationLineBreaks(text: string): string {
  if (!text || text.includes("\n")) return text;
  if (!/Step\s+\d+/i.test(text)) return text;
  return text.replace(/\s*(?=Step\s+\d+\s*:)/gi, "\n\n").trim();
}

export function hasForbiddenDash(text: string): boolean {
  return text.includes(EM_DASH) || text.includes(EN_DASH);
}

export function sanitizeWrongOptionReasons(
  raw: unknown,
): Partial<Record<"A" | "B" | "C" | "D", string>> | undefined {
  const rec = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
  if (!rec) return undefined;
  const out: Partial<Record<"A" | "B" | "C" | "D", string>> = {};
  for (const key of ["A", "B", "C", "D"] as const) {
    const v = rec[key];
    if (typeof v === "string" && v.trim()) {
      out[key] = sanitizeStudentFacingCopy(v);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeReviewObject(raw: unknown): Record<string, unknown> | undefined {
  const rec = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
  if (!rec) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (typeof value === "string") {
      out[key] = sanitizeStudentFacingCopy(value);
    } else {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function sanitizeSjtItems(raw: unknown): unknown[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((item) => {
    const row = item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : null;
    if (!row) return item;
    const copy = { ...row };
    for (const key of ["text", "rationale", "whyNotAdjacent"]) {
      if (typeof copy[key] === "string") {
        copy[key] = sanitizeStudentFacingCopy(copy[key] as string);
      }
    }
    return copy;
  });
}

export function sanitizeConversionExplanationObj(
  raw: unknown,
): Record<string, unknown> | undefined {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
  if (!obj) return undefined;

  const method = obj.method && typeof obj.method === "object"
    ? (obj.method as Record<string, unknown>)
    : null;

  return {
    method: method
      ? {
          target: sanitizeStudentFacingCopy(String(method.target ?? "")),
          convert: sanitizeStudentFacingCopy(String(method.convert ?? "")),
          calculate: sanitizeStudentFacingCopy(String(method.calculate ?? "")),
        }
      : { target: "", convert: "", calculate: "" },
    examShortcut: sanitizeStudentFacingCopy(
      String(obj.examShortcut ?? obj.exam_shortcut ?? ""),
    ),
    senseCheck: sanitizeStudentFacingCopy(String(obj.senseCheck ?? obj.sense_check ?? "")),
    commonTrap: sanitizeStudentFacingCopy(String(obj.commonTrap ?? obj.common_trap ?? "")),
  };
}

/** Deep-sanitize known student-facing string fields inside content JSON. */
export function sanitizeQuestionContent(
  content: Record<string, unknown>,
  questionKind: string,
): Record<string, unknown> {
  const out = { ...content };

  if (typeof out.generalRule === "string") {
    out.generalRule = sanitizeStudentFacingCopy(out.generalRule);
  }
  if (typeof out.keyInsight === "string") {
    out.keyInsight = sanitizeStudentFacingCopy(out.keyInsight);
  }
  if (typeof out.pivotInsight === "string") {
    out.pivotInsight = sanitizeStudentFacingCopy(out.pivotInsight);
  }
  if (typeof out.workedSolution === "string") {
    out.workedSolution = sanitizeStudentFacingCopy(out.workedSolution);
  }
  if (typeof out.commonTrap === "string") {
    out.commonTrap = sanitizeStudentFacingCopy(out.commonTrap);
  }
  if (typeof out.question === "string") {
    out.question = sanitizeStudentFacingCopy(out.question);
  }

  const reasons = sanitizeWrongOptionReasons(out.wrongOptionReasons);
  if (reasons) out.wrongOptionReasons = reasons;

  const review = sanitizeReviewObject(out.review);
  if (review) out.review = review;

  const exp = sanitizeConversionExplanationObj(out.explanation);
  if (exp) out.explanation = exp;

  if (questionKind === "appropriateness" || questionKind === "importance" || questionKind === "ranking") {
    const items = sanitizeSjtItems(out.items);
    if (items) out.items = items;
  }

  if (out.options && typeof out.options === "object" && !Array.isArray(out.options)) {
    const opts = out.options as Record<string, unknown>;
    const sanitized: Record<string, string> = {};
    for (const key of ["A", "B", "C", "D"]) {
      if (typeof opts[key] === "string") {
        sanitized[key] = sanitizeStudentFacingCopy(opts[key]);
      }
    }
    if (Object.keys(sanitized).length) out.options = sanitized;
  }

  return out;
}
