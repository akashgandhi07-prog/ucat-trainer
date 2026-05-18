import { supabase } from "./supabase";

export const QUESTION_MEDIA_BUCKET = "question-media";

export function resolveQuestionMediaSrc(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }

  const normalisedPath = trimmed.replace(/^\/+/, "");
  const { data } = supabase.storage
    .from(QUESTION_MEDIA_BUCKET)
    .getPublicUrl(normalisedPath);

  return data.publicUrl;
}
