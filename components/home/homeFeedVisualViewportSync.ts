import { isHomeFeedMobileViewport } from "@/components/home/homeFeedMobileScrollReset";

export const GN_HOME_FEED_VV_LEFT_VAR = "--gn-home-feed-vv-left";
export const GN_HOME_FEED_VV_WIDTH_VAR = "--gn-home-feed-vv-width";

/** Feed nodes only — never set VV vars on `[data-app-main]` (leaks into profile/admin after SPA nav). */
const HOME_FEED_VV_SYNC_SELECTORS = [
  "[data-pitchrusch-home-feed]",
  "[data-pitchrusch-feed-panel]",
  "[data-pitchrusch-feed-scroll-root]",
] as const;

function homeFeedVisualViewportMetrics(): { left: string; width: string } {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const widthPx = vv?.width ?? window.innerWidth;
  return {
    left: "0px",
    width: `${widthPx}px`,
  };
}

/** Apply visual viewport CSS vars while {@link HomeFeed} is mounted (iOS / in-app browsers). */
export function syncHomeFeedVisualViewportVars(): void {
  if (typeof document === "undefined" || !isHomeFeedMobileViewport()) return;

  const { left, width } = homeFeedVisualViewportMetrics();

  for (const selector of HOME_FEED_VV_SYNC_SELECTORS) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) continue;
    el.style.setProperty(GN_HOME_FEED_VV_LEFT_VAR, left);
    el.style.setProperty(GN_HOME_FEED_VV_WIDTH_VAR, width);
  }
}

/** Remove inline viewport vars on unmount. */
export function clearHomeFeedVisualViewportVars(): void {
  if (typeof document === "undefined") return;

  for (const selector of HOME_FEED_VV_SYNC_SELECTORS) {
    const el = document.querySelector(selector);
    if (!(el instanceof HTMLElement)) continue;
    el.style.removeProperty(GN_HOME_FEED_VV_LEFT_VAR);
    el.style.removeProperty(GN_HOME_FEED_VV_WIDTH_VAR);
  }
}
