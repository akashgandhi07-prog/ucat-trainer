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
    "- Explanations use Step 1:, Step 2:, etc. Put a blank line BEFORE each Step label (Step 2 onward must not sit at the end of the previous sentence). Put a blank line after each Step N: before the step body.",
    "- Never write: let me, recheck, redesign, note:, wait, actually, requires revision.",
    "",
    "Hidden verification fields (required on every question, stripped before students see them):",
    "- solutionFormula: one-line formula or procedure you used (e.g. |A∩B| = |A| + |B| − total + neither).",
    "- computedAnswer: numeric answer your method produces (must match correctAnswer / keyed option).",
    "- distractorLogic: one line per wrong option: letter + named wrong method.",
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
    "Return ONLY JSON:",
    '{ "mathsCorrect": boolean, "oneCorrectAnswer": boolean, "explanationMatches": boolean, "ucatStyle": boolean, "issues": string[] }',
    "",
    "Score booleans (all must be true for a perfect question):",
    "- mathsCorrect: stem numbers, correctAnswer, option values, and explanation arithmetic agree.",
    "- oneCorrectAnswer: exactly one defensible correct option; stem is unambiguous.",
    "- explanationMatches: explanation supports the keyed answer, not a different number.",
    "- ucatStyle: UK English, no em/en dash, no AI chat filler; Step 1/2 labels are required (do not fail ucatStyle for those).",
    "List concrete fixes in issues. Check hidden fields solutionFormula and computedAnswer if present.",
    "Plugin line is advisory; verify maths yourself when plugin says not auto-verified.",
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
    "- Fix every issue in repairIssues so re-audit scores mathsCorrect, oneCorrectAnswer, explanationMatches, and ucatStyle all true.",
    "- Keep solutionFormula, computedAnswer, and distractorLogic aligned with the keyed answer.",
    "- Re-solve the question: align stem, all options, correctAnswer, and every explanation step.",
    "- If audit cited a calculation error, fix the numbers and the keyed answer, not just the prose.",
    "- UK English. No em or en dash. No AI voice (let me, certainly, delve, furthermore, in conclusion).",
    "- Explanations: blank line before each Step 2+ label, and blank line after each Step N: before its body.",
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
