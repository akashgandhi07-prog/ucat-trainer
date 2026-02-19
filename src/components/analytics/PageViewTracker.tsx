import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../lib/analytics";

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Tracks page views on route change. Must be rendered inside BrowserRouter.
 * Sends events to both Supabase analytics and Google Tag Manager (for GA4, Ads, etc.).
 */
export function PageViewTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Internal product analytics (Supabase)
    trackPageView();

    // Google Tag Manager / GA4 page_view for SPA navigation
    if (typeof window !== "undefined") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "page_view",
        page_path: pathname + search,
      });
    }
  }, [pathname, search]);

  return null;
}
