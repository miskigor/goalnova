/** Mobile-only horizontal scroll reset for `/home` — used only while {@link HomeFeed} is mounted. */

const HOME_FEED_MOBILE_MAX_WIDTH_PX = 1023;

const HOME_FEED_MOUNTED_SCROLL_RESET_SELECTORS = [
  "[data-mlv2-scroll]",
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-pitchrusch-feed-scroll-root]",
] as const;

export function isHomeFeedMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${HOME_FEED_MOBILE_MAX_WIDTH_PX}px)`).matches;
}

/** iOS Safari: clear window + shell + feed scrollport horizontal offset. */
export function runHomeFeedMountedScrollReset(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (!isHomeFeedMobileViewport()) return;

  window.scrollTo(0, window.scrollY);
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;

  for (const selector of HOME_FEED_MOUNTED_SCROLL_RESET_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.scrollLeft = 0;
      if (selector === "[data-pitchrusch-feed-scroll-root]") {
        node.scrollTop = 0;
      }
    });
  }
}
