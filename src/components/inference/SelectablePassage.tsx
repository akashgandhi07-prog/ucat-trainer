import { useRef, type ReactElement } from "react";
import type { RefObject } from "react";
import type { TextSpan } from "../../types/inference";

type HighlightSpan = { span: TextSpan; type: "correct" | "incorrect" };

type SelectablePassageProps = {
  passageText: string;
  passageRef: RefObject<HTMLDivElement | null>;
  highlights?: HighlightSpan[];
  className?: string;
};

/**
 * Renders passage text. If highlights are provided, renders with highlighted spans.
 * Otherwise renders plain selectable text.
 * Parent calls getSelectionFromDom(passageRef) to capture selection offsets.
 */
export default function SelectablePassage({
  passageText,
  passageRef,
  highlights = [],
  className = "",
}: SelectablePassageProps) {
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  if (highlights.length === 0) {
    const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
      pointerDownPosRef.current = { x: event.clientX, y: event.clientY };
      isDraggingRef.current = false;
    };

    const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
      if (!pointerDownPosRef.current) return;
      const dx = Math.abs(event.clientX - pointerDownPosRef.current.x);
      const dy = Math.abs(event.clientY - pointerDownPosRef.current.y);
      if (dx > 3 || dy > 3) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
      pointerDownPosRef.current = null;
    };

    const handleSentenceClick: React.MouseEventHandler<HTMLSpanElement> = (
      event
    ) => {
      // If the user dragged to create a custom selection, don't override it
      if (isDraggingRef.current) return;

      const node = event.currentTarget;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const segments: ReactElement[] = [];
    const lines = passageText.split("\n");

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        segments.push(
          <span key={`nl-${lineIndex}`}>{"\n"}</span>
        );
      }

      if (!line) {
        return;
      }

      const sentenceRegex = /[^.!?]+[.!?]?(?:\s+|$)/g;
      let match: RegExpExecArray | null;

      while ((match = sentenceRegex.exec(line)) !== null) {
        const sentenceText = match[0];
        if (!sentenceText) continue;

        segments.push(
          <span
            key={`s-${lineIndex}-${match.index}`}
            onClick={handleSentenceClick}
            className="cursor-pointer hover:bg-blue-100 transition-colors rounded-sm px-0.5 -mx-0.5"
          >
            {sentenceText}
          </span>
        );
      }
    });

    return (
      <div
        ref={passageRef as RefObject<HTMLDivElement>}
        className={`selectable-passage text-slate-800 leading-[1.7] text-[15px] whitespace-pre-wrap select-text ${className}`}
        data-passage-text={passageText}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {segments}
      </div>
    );
  }

  // Build segments with highlights
  const segments: { start: number; end: number; type?: "correct" | "incorrect" }[] = [];
  const sorted = [...highlights].sort((a, b) => a.span.start - b.span.start);

  let pos = 0;
  for (const h of sorted) {
    if (h.span.start > pos) {
      segments.push({ start: pos, end: h.span.start });
    }
    segments.push({
      start: h.span.start,
      end: h.span.end,
      type: h.type,
    });
    pos = Math.max(pos, h.span.end);
  }
  if (pos < passageText.length) {
    segments.push({ start: pos, end: passageText.length });
  }

  return (
    <div
      ref={passageRef as RefObject<HTMLDivElement>}
      className={`text-slate-800 leading-[1.7] text-[15px] whitespace-pre-wrap select-text ${className}`}
    >
      {segments.map((seg, i) => {
        const text = passageText.slice(seg.start, seg.end);
        if (seg.type === "correct") {
          return (
            <mark
              key={i}
              className="bg-emerald-200/90 border-l-4 border-emerald-600 text-emerald-900 pl-1 -ml-1 rounded-r font-medium"
            >
              {text}
            </mark>
          );
        }
        if (seg.type === "incorrect") {
          return (
            <mark
              key={i}
              className="bg-red-100 border-l-4 border-red-500 text-red-900 pl-1 -ml-1 rounded-r font-medium"
            >
              {text}
            </mark>
          );
        }
        return <span key={i}>{text}</span>;
      })}
    </div>
  );
}

