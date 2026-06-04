/** Mobile V2 scrollport — reset on route change so page titles start at the top. */

const MLV2_SCROLL_SELECTOR = "[data-mlv2-scroll]";
const MLV2_MOBILE_MAX_WIDTH_PX = 1023;
const ROUTE_RESET_DELAYS_MS = [100, 300, 600] as const;

export function isMlv2MobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MLV2_MOBILE_MAX_WIDTH_PX}px)`).matches;
}

export function isMlv2HomePathname(pathname: string): boolean {
  return pathname === "/home" || pathname.startsWith("/home/");
}

function resolveMlv2ScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const scroll = document.querySelector(MLV2_SCROLL_SELECTOR);
  return scroll instanceof HTMLElement ? scroll : null;
}

/** Clears vertical/horizontal scroll on the V2 shell scrollport. */
export function resetMlv2ScrollPosition(): void {
  if (!isMlv2MobileViewport()) return;

  const scroll = resolveMlv2ScrollElement();
  if (scroll) {
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
  }
}

/**
 * Aggressive reset for non-home routes — immediate, rAF, and delayed passes so
 * late layout/paint cannot restore a stale scrollTop from the previous page.
 */
export function scheduleMlv2ScrollReset(pathname: string): () => void {
  if (isMlv2HomePathname(pathname) || !isMlv2MobileViewport()) {
    return () => {};
  }

  const timeoutIds: number[] = [];
  let rafId: number | null = null;

  const doReset = () => {
    const scroll = resolveMlv2ScrollElement();
    if (!scroll) return;
    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;
  };

  doReset();
  rafId = window.requestAnimationFrame(doReset);
  for (const ms of ROUTE_RESET_DELAYS_MS) {
    timeoutIds.push(window.setTimeout(doReset, ms));
  }

  return () => {
    if (rafId != null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    for (const id of timeoutIds) {
      window.clearTimeout(id);
    }
  };
}

/** Prevent browser scroll restoration from re-applying old positions between V2 routes. */
export function enableMlv2ScrollRestorationManual(): () => void {
  if (typeof window === "undefined" || !isMlv2MobileViewport()) {
    return () => {};
  }

  const previous = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";

  return () => {
    window.history.scrollRestoration = previous;
  };
}
