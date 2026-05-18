export type QuestionMediaType = "image";

export type QuestionMediaPlacement = "stem" | "question" | "answer" | "explanation";

export type QuestionMedia = {
  id: string;
  type: QuestionMediaType;
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  width?: number;
  height?: number;
  placement?: QuestionMediaPlacement;
  metadata?: Record<string, unknown>;
};

export function isQuestionMedia(value: unknown): value is QuestionMedia {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.type === "image" &&
    typeof item.src === "string" &&
    item.src.trim().length > 0 &&
    typeof item.alt === "string" &&
    item.alt.trim().length > 0
  );
}

export function normaliseQuestionMedia(value: unknown): QuestionMedia[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<QuestionMedia[]>((media, item, index) => {
    if (!isQuestionMedia(item)) return media;
    const candidate = item as Record<string, unknown>;
    media.push({
      ...item,
      id:
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? candidate.id
          : `${item.type}:${item.src}:${index}`,
      placement:
        candidate.placement === "stem" ||
        candidate.placement === "question" ||
        candidate.placement === "answer" ||
        candidate.placement === "explanation"
          ? candidate.placement
          : undefined,
      width:
        typeof candidate.width === "number" && Number.isFinite(candidate.width) && candidate.width > 0
          ? candidate.width
          : undefined,
      height:
        typeof candidate.height === "number" && Number.isFinite(candidate.height) && candidate.height > 0
          ? candidate.height
          : undefined,
    });
    return media;
  }, []);
}
