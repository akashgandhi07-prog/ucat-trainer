import type { TrainerGenerateProfile } from "./types.ts";

export function buildGenerateMessages(input: {
  profile: TrainerGenerateProfile;
  outputSpec: string;
  goldStandard: string;
  count: number;
  skillTag?: string;
  difficulty?: string;
  bankSnippet?: string;
}): Array<{ role: "system" | "user"; content: string }> {
  const { profile, outputSpec, goldStandard, count, skillTag, difficulty, bankSnippet } =
    input;

  const system = [
    `You write new ${profile.label} questions for The UKCAT People skills trainer.`,
    "",
    "OFFICIAL UCAT EXAMPLES (learn style, traps, difficulty only; do not copy stems):",
    goldStandard.slice(0, 120_000),
    "",
    "OUTPUT FORMAT (follow exactly):",
    outputSpec.slice(0, 120_000),
    "",
    "Rules:",
    "- Return ONLY a JSON array. No markdown fences, no commentary.",
    `- Generate at most ${count} questions.`,
    "- UK English only (organise, colour, centre, behaviour, analyse, favourite, defence).",
    "- No em dashes or en dashes (U+2014, U+2013). Use comma, colon, full stop, or ·.",
    "- No AI or chatbot voice: no 'let me', 'certainly', 'it's important to note', 'delve', 'leverage', 'furthermore', 'in conclusion', exclamation marks, or self-correction.",
    "- Plain, direct wording for students under time pressure. Teach the method, not an essay.",
    "- New scenarios and numbers only.",
    "- Before writing each question, solve it yourself and ensure exactly one correct answer.",
    "- Each wrong option must come from a named wrong method (see output spec distractor rules).",
    "- requiresVisual must be false.",
    "- Explanations are final student-facing text with Step 1:, Step 2:, etc. and \\n\\n between steps.",
    "- Never write: let me, recheck, redesign, note:, wait, actually, requires revision.",
  ].join("\n");

  const userParts = [
    `Generate ${count} new ${profile.label} questions.`,
  ];
  if (skillTag) userParts.push(`Prefer skill_tag: ${skillTag}.`);
  if (difficulty) userParts.push(`Prefer difficulty: ${difficulty}.`);
  if (bankSnippet) {
    userParts.push("", "Avoid duplicating these existing scenarios:", bankSnippet.slice(0, 8_000));
  }
  userParts.push("", "JSON array only.");

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n") },
  ];
}

export function buildAuditMessages(input: {
  profile: TrainerGenerateProfile;
  outputSpec: string;
  questionJson: string;
  pluginSummary: string;
}): Array<{ role: "system" | "user"; content: string }> {
  const auditRules = input.outputSpec.includes("## 9. Self-Check")
    ? input.outputSpec.slice(input.outputSpec.indexOf("## 9. Self-Check"))
    : input.outputSpec.slice(-4_000);

  const system = [
    `You audit ${input.profile.label} draft questions for The UKCAT People.`,
    "Return ONLY JSON: { \"verdict\": \"pass\" | \"needs_review\", \"issues\": string[] }",
    "If the plugin line says human review, not auto-verified, or verified: false, verdict must be needs_review.",
    "Do not override a passing verified plugin on maths; flag pedagogy, ambiguity, and weak traps only.",
    "Check UK English, no em/en dash, no AI/chatbot phrasing, and clear student wording in stem, question, options, and explanation.",
    "Flag US spellings, filler phrases, exclamation marks, and tutorial voice (e.g. 'in this question we will').",
    "",
    "Quality rules excerpt:",
    auditRules.slice(0, 6_000),
  ].join("\n");

  const user = [
    input.pluginSummary,
    "",
    "Question JSON:",
    input.questionJson.slice(0, 12_000),
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildRepairMessages(input: {
  profile: TrainerGenerateProfile;
  outputSpec: string;
  items: Array<{ legacyId: string; raw: Record<string, unknown>; issues: string }>;
}): Array<{ role: "system" | "user"; content: string }> {
  const payload = input.items.map((item) => ({
    id: item.legacyId,
    repairIssues: item.issues,
    question: item.raw,
  }));

  const system = [
    `You fix draft ${input.profile.label} questions for The UKCAT People.`,
    "",
    "OUTPUT FORMAT (follow exactly):",
    input.outputSpec.slice(0, 80_000),
    "",
    "Rules:",
    "- Return ONLY a JSON array with the same number of questions, same order, same id on each.",
    "- Fix every issue in repairIssues. Keep the same scenario where possible; fix numbers only if needed for consistency.",
    "- UK English. No em or en dash. No AI voice (let me, certainly, delve, furthermore, in conclusion).",
    "- Explanations: Step 1:, Step 2:, with \\n\\n between steps.",
    "- Do not add commentary outside JSON.",
  ].join("\n");

  const user = [
    `Fix these ${input.items.length} question(s). Each object includes repairIssues to address.`,
    "",
    JSON.stringify(payload, null, 2),
    "",
    "JSON array only.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
