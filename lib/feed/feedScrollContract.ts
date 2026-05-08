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
export function resetHomeFeedHorizontalScroll(): void {
  if (typeof document === "undefined") return;
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  document
    .querySelectorAll("[data-pitchrusch-feed-scroll-root]")
    .forEach((el) => {
      if (el instanceof HTMLElement) el.scrollLeft = 0;
    });
  if (typeof window !== "undefined" && window.scrollX) {
    window.scrollTo({
      left: 0,
      top: window.scrollY,
      behavior: "auto",
    });
  }
}
