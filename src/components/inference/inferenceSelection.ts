import type { RefObject } from "react";
import type { TextSpan } from "../../types/inference";

/**
 * Capture current selection as TextSpan relative to passage element.
 * Returns null if no valid selection within passage.
 */
export function getSelectionFromPassage(
  passageRef: RefObject<HTMLDivElement | null>,
  passageText: string
): TextSpan | null {
  const el = passageRef.current;
  if (!el) return null;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return null;

  const preCaretRange = document.createRange();
  preCaretRange.selectNodeContents(el);
  preCaretRange.setEnd(range.startContainer, range.startOffset);

  const start = preCaretRange.toString().length;
  const end = start + range.toString().length;

  if (start >= end || start < 0 || end > passageText.length) return null;
  return { start, end };
}
