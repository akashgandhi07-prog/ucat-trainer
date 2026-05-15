/** Shared horizontal padding for app shell top bar and page content. */
export const APP_CONTENT_X = "px-4 sm:px-6 lg:px-8";

/** Full width inside the app shell main column (beside sidebar). */
export const APP_SHELL_CONTENT_WIDTH = "w-full";

/** Left-aligned content width for standalone pages (no sidebar). */
export const APP_CONTENT_WIDTH = "w-full max-w-5xl";
export const APP_CONTENT_WIDTH_NARROW = "w-full max-w-4xl";

export function appContentWidthClass(options: { inAppShell: boolean; wide?: boolean }): string {
  if (options.inAppShell) return APP_SHELL_CONTENT_WIDTH;
  return options.wide ? APP_CONTENT_WIDTH : APP_CONTENT_WIDTH_NARROW;
}
