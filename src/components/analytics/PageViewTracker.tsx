import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../lib/analytics";

/**
 * Tracks page views on route change. Must be rendered inside BrowserRouter.
 */
export function PageViewTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView();
  }, [pathname]);
  return null;
}
