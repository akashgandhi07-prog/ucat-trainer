import { useEffect, useState } from "react";
import { ImageOff, Maximize2, X } from "lucide-react";
import { resolveQuestionMediaSrc } from "../../lib/questionMedia";
import type { QuestionMedia, QuestionMediaPlacement } from "../../types/questionMedia";

type QuestionMediaBlockProps = {
  media?: QuestionMedia[];
  placement?: QuestionMediaPlacement;
  className?: string;
};

function mediaMatchesPlacement(media: QuestionMedia, placement?: QuestionMediaPlacement): boolean {
  if (!placement) return true;
  return !media.placement || media.placement === placement;
}

export default function QuestionMediaBlock({
  media = [],
  placement,
  className = "",
}: QuestionMediaBlockProps) {
  const [expanded, setExpanded] = useState<QuestionMedia | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const visibleMedia = media.filter((item) => item.type === "image" && mediaMatchesPlacement(item, placement));

  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [expanded]);

  if (visibleMedia.length === 0) return null;

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {visibleMedia.map((item) => {
          const resolvedSrc = resolveQuestionMediaSrc(item.src);
          if (!resolvedSrc) return null;

          return (
            <figure
              key={item.id}
              className="overflow-hidden rounded-lg border border-border bg-white"
            >
              <div className="relative bg-secondary">
                {failedIds.has(item.id) ? (
                  <div className="flex min-h-40 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                    <ImageOff className="h-5 w-5" aria-hidden />
                    Image unavailable
                  </div>
                ) : (
                  <img
                    src={resolvedSrc}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    loading="lazy"
                    decoding="async"
                    className="mx-auto max-h-[32rem] w-full object-contain"
                    onError={() => {
                      setFailedIds((current) => {
                        const next = new Set(current);
                        next.add(item.id);
                        return next;
                      });
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setExpanded(item)}
                  className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white/90 text-foreground hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Expand image"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {(item.caption || item.credit) && (
                <figcaption className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  {item.caption && <span>{item.caption}</span>}
                  {item.caption && item.credit && <span> - </span>}
                  {item.credit && <span>{item.credit}</span>}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded question image"
          onClick={() => setExpanded(null)}
        >
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground shadow-lg hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close expanded image"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <figure
            className="max-h-full max-w-6xl overflow-auto rounded-lg bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={resolveQuestionMediaSrc(expanded.src)}
              alt={expanded.alt}
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
            {(expanded.caption || expanded.credit) && (
              <figcaption className="border-t border-border px-4 py-3 text-sm text-foreground">
                {expanded.caption && <span>{expanded.caption}</span>}
                {expanded.caption && expanded.credit && <span> - </span>}
                {expanded.credit && <span>{expanded.credit}</span>}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
