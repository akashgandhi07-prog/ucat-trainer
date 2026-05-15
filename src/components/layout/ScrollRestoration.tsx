import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the window scroll position on route change. Use for routes rendered outside {@link AppShell}
 * (where the document body scrolls instead of the shell's main column).
 */
export function WindowScrollToTop() {
  const location = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.key]);
  return null;
}
