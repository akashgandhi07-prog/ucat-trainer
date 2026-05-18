/** Matches the scrollable column in {@link AppShell}. */
export const APP_MAIN_SCROLL_ID = "app-main-scroll";

/**
 * Scroll to top of the visible page. In the app shell the main column scrolls, not the document.
 */
export function scrollPageToTop(options?: { behavior?: ScrollBehavior }): void {
  if (typeof window === "undefined") return;
  const behavior = options?.behavior ?? "smooth";
  const main = document.getElementById(APP_MAIN_SCROLL_ID);
  if (main) {
    main.scrollTo({ top: 0, behavior });
  }
  window.scrollTo({ top: 0, behavior });
}
