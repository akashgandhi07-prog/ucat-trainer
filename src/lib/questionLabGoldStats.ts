/** How many official examples appear to be pasted (after the --- divider). */
export function countOfficialExamples(md: string): {
  count: number;
  isEmpty: boolean;
  wordCount: number;
} {
  const parts = md.split(/\n---\n/);
  let body = (parts.length > 1 ? parts.slice(1).join("\n---\n") : md).trim();
  body = body
    .replace(/\[Paste official examples below[^\]]*\]\s*/gi, "")
    .replace(/^Here are official questions[^\n]*\n*/gim, "")
    .trim();
  const examples = (body.match(/^###\s+Example\b/gim) ?? []).length;
  const numbered = (body.match(/^Example\s+\d+/gim) ?? []).length;
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const isEmpty = wordCount < 80;
  const estimated =
    examples > 0
      ? examples
      : numbered > 0
        ? numbered
        : wordCount >= 200
          ? Math.min(12, Math.ceil(wordCount / 120))
          : wordCount >= 80
            ? 1
            : 0;
  return { count: estimated, isEmpty, wordCount };
}
