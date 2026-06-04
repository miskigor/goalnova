/** Mobile V2 scrollport — reset on route change so page titles start at the top. */

const MLV2_SCROLL_SELECTOR = "[data-mlv2-scroll]";
const MLV2_MOBILE_MAX_WIDTH_PX = 1023;

export function isMlv2MobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MLV2_MOBILE_MAX_WIDTH_PX}px)`).matches;
}

/** Clears vertical/horizontal scroll on the V2 shell scrollport (not home feed snap). */
export function resetMlv2ScrollPosition(): void {
  if (typeof document === "undefined") return;
  if (!isMlv2MobileViewport()) return;

  const scroll = document.querySelector(MLV2_SCROLL_SELECTOR);
  if (scroll instanceof HTMLElement) {
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
  }
}
