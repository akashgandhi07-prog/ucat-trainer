export function buildGenerationPrompt(trainerLabel: string): string {
  return [
    `You are writing new ${trainerLabel} questions for The UKCAT People skills trainer.`,
    "",
    "I will paste three blocks in separate messages (or one message with clear headings):",
    "1) OFFICIAL UCAT EXAMPLES — learn skills, wording, difficulty, and traps from these only.",
    "2) OUR OUTPUT FORMAT — follow this exactly for every new question.",
    "3) (Optional) CURRENT BANK — avoid duplicate scenarios; fill skill gaps.",
    "",
    "Your task:",
    "- Infer the skills being tested from the official examples.",
    "- Write NEW questions only (new scenarios and numbers; do not copy official stems).",
    "- Return ONLY a JSON array. No markdown fences, no commentary before or after.",
    "- UK English. No em dashes or en dashes.",
    "- Match the JSON shape in the output format spec.",
    "",
    "Before the JSON, add a one-line header comment is NOT allowed. JSON array only.",
  ].join("\n");
}

export function buildAuditPrompt(trainerLabel: string): string {
  return [
    `You are auditing ${trainerLabel} questions for The UKCAT People.`,
    "",
    "I will paste:",
    "1) OUR OUTPUT FORMAT (quality rules)",
    "2) CURRENT BANK (JSON)",
    "",
    "Review every question and report:",
    "- Maths or logic errors",
    "- Ambiguous correct answers",
    "- Weak explanations (not teaching the method)",
    "- Duplicates or near-duplicates",
    "- Missing skill coverage vs official examples",
    "",
    "Output a short table: legacy_id | verdict (pass / fix / remove) | reason",
    "Then list the top 5 fixes in priority order.",
  ].join("\n");
}
