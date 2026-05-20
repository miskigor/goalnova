/**
 * Home feed scroll contract: `[data-pitchrusch-feed-scroll-root]` is the vertical
 * snap scrollport (mobile: full-viewport layer under shell chrome); each
 * `[data-pitchrusch-feed-item]` is one snap page (full scrollport height per item).
 */
export const feedScrollRootProps = {
  "data-pitchrusch-feed-scroll-root": true,
} as const;

export const feedItemsListProps = {
  "data-pitchrusch-feed-items": true,
} as const;

export const feedItemProps = {
  "data-pitchrusch-feed-item": true,
} as const;

export const feedCardProps = {
  "data-pitchrusch-feed-card": true,
} as const;

export const feedVideoProps = {
  "data-pitchrusch-feed-video": true,
} as const;

export const feedMetaProps = {
  "data-pitchrusch-feed-meta": true,
} as const;

/**
 * iOS/WebKit often leave `scrollX > 0` or nested `scrollLeft` after input zoom / keyboard.
 * Call after comment submit or when closing modals tied to the feed.
 */
const HOME_FEED_SCROLL_RESET_SELECTORS = [
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-pitchrusch-home-feed]",
  "[data-pitchrusch-feed-panel]",
  "[data-pitchrusch-feed-scroll-root]",
  "[data-pitchrusch-feed-card]",
] as const;

/** Zero horizontal scroll on shell + feed nodes (iOS Safari / input zoom). */
export function resetHomeFeedHorizontalScroll(): void {
  if (typeof document === "undefined") return;
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  for (const selector of HOME_FEED_SCROLL_RESET_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLElement) node.scrollLeft = 0;
    });
  }
  if (typeof window === "undefined") return;
  if (window.scrollX) {
    window.scrollTo({
      left: 0,
      top: window.scrollY,
      behavior: "auto",
    });
  }
  const vv = window.visualViewport;
  if (vv && (vv.offsetLeft !== 0 || vv.pageLeft !== 0)) {
    window.scrollTo({
      left: 0,
      top: window.scrollY,
      behavior: "auto",
    });
  }
}
