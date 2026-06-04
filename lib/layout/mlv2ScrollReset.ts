/** Mobile V2 scrollport — reset on route change so page titles start at the top. */

import { devLog, isDev } from "@/lib/devLog";

const MLV2_SCROLL_SELECTOR = "[data-mlv2-scroll]";
const MLV2_MOBILE_MAX_WIDTH_PX = 1023;
/** immediate + rAF + delayed passes to beat browser/iOS scroll restoration. */
const ROUTE_RESET_DELAYS_MS = [50, 150, 300, 600] as const;

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

/** Clears vertical/horizontal scroll on the V2 shell scrollport only. */
export function resetMlv2ScrollPosition(pathname = ""): void {
  if (!isMlv2MobileViewport()) return;

  const scroll = resolveMlv2ScrollElement();
  if (!scroll) return;

  const scrollTopBefore = scroll.scrollTop;
  scroll.scrollTop = 0;
  scroll.scrollLeft = 0;

  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;

  if (pathname && !isMlv2HomePathname(pathname) && typeof window !== "undefined") {
    window.scrollTo(0, 0);
  }

  if (isDev && pathname) {
    devLog("[PitchRusch V2 scroll reset]", {
      pathname,
      scrollTopBefore,
      scrollTopAfter: scroll.scrollTop,
    });
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
    resetMlv2ScrollPosition(pathname);
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
  try {
    window.history.scrollRestoration = "manual";
  } catch {
    return () => {};
  }

  return () => {
    try {
      window.history.scrollRestoration = previous;
    } catch {
      /* ignore */
    }
  };
}
