/** Home feed video roots — production clean feed + legacy pitchrusch feed. */
const HOME_FEED_VIDEO_SELECTORS = [
  "[data-home-clean-v3] video",
  "[data-pitchrusch-home-feed] video",
  '[data-mlv3-route="home-feed"] video',
] as const;

/**
 * Stop audible home-feed playback when leaving `/home` or tearing the feed down.
 * Explicit pause is required — especially on iOS Safari, removing a playing `<video>`
 * from the DOM does not always stop audio immediately.
 */
export function pauseHomeFeedMedia(): void {
  if (typeof document === "undefined") return;

  for (const selector of HOME_FEED_VIDEO_SELECTORS) {
    document.querySelectorAll<HTMLVideoElement>(selector).forEach((video) => {
      try {
        video.pause();
        video.muted = true;
        video.volume = 0;
      } catch {
        /* ignore */
      }
    });
  }
}

export function isHomeFeedPathname(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  return (
    path === "/home" ||
    path.endsWith("/home") ||
    path.includes("/home/") ||
    path === "/debug/mobile-layout-v3/home-feed" ||
    path === "/debug/mobile-layout-v3/home-mock"
  );
}
