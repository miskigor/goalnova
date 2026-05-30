"use client";

import { useLayoutEffect } from "react";

const GN_HEADER_OFFSET_MEASURED = "--gn-app-header-offset-measured";
const GN_BOTTOM_NAV_OFFSET_MEASURED = "--gn-app-bottom-nav-offset-measured";
const GN_MOBILE_VISUAL_BOTTOM_INSET_VAR = "--gn-mobile-visual-bottom-inset";
const GN_PREMIUM_SAFE_TOP_VAR = "--gn-premium-safe-top";

function measureTopChromeInsetPx(): number {
  const headerEl =
    document.querySelector('[data-app-mobile-chrome-fixed="top"]') ??
    document.querySelector("[data-app-mobile-header]");
  if (headerEl instanceof HTMLElement) {
    const bottom = Math.ceil(headerEl.getBoundingClientRect().bottom);
    if (bottom > 0) return bottom;
  }
  return 0;
}

function measureVisualBottomInsetPx(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.ceil(window.innerHeight - (vv.offsetTop + vv.height)));
}

function isPremiumFitPage(): boolean {
  return Boolean(document.querySelector("[data-premium-fit-viewport]"));
}

function isHomeFeedPage(): boolean {
  return Boolean(document.querySelector("[data-pitchrusch-home-feed]"));
}

/** Sticky max — never shrink when Safari hides the bottom toolbar while scrolling. */
let stickyVisualBottomInsetPx = 0;

function syncMobileChromeMetrics() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  if (isHomeFeedPage()) {
    root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
    root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);
    root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
    root.style.removeProperty(GN_PREMIUM_SAFE_TOP_VAR);
    stickyVisualBottomInsetPx = 0;
    return;
  }

  const isPremium = isPremiumFitPage();
  const vv = window.visualViewport;
  const layoutBottomGap = measureVisualBottomInsetPx();
  stickyVisualBottomInsetPx = Math.max(stickyVisualBottomInsetPx, layoutBottomGap);

  const premiumSafeTopPx = isPremium && vv ? Math.max(0, Math.ceil(vv.offsetTop)) : 0;

  const headerPx = measureTopChromeInsetPx();

  if (headerPx > 0) {
    root.style.setProperty(GN_HEADER_OFFSET_MEASURED, `${headerPx}px`);
  } else {
    root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
  }

  /*
   * Tab bar position uses fixed CSS padding — do not measure [data-app-bottom-nav]
   * (ResizeObserver + padding feedback caused the bar to wander while scrolling).
   */
  root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);

  if (isPremium) {
    root.style.setProperty(
      GN_MOBILE_VISUAL_BOTTOM_INSET_VAR,
      `${Math.max(stickyVisualBottomInsetPx, 8)}px`,
    );
    root.style.setProperty(GN_PREMIUM_SAFE_TOP_VAR, `${premiumSafeTopPx}px`);
  } else {
    root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
    root.style.removeProperty(GN_PREMIUM_SAFE_TOP_VAR);
  }
}

function clearMobileChromeMetrics() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
  root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);
  root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
  root.style.removeProperty(GN_PREMIUM_SAFE_TOP_VAR);
  stickyVisualBottomInsetPx = 0;
}

/**
 * Header inset for tab pages. Bottom tab bar uses fixed CSS — no visualViewport scroll sync.
 */
export function AppMobileChromeMetrics() {
  useLayoutEffect(() => {
    syncMobileChromeMetrics();

    const observed = new Set<Element>();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncMobileChromeMetrics())
        : null;

    const headerSelectors = [
      '[data-app-mobile-chrome-fixed="top"]',
      "[data-app-mobile-header]",
    ] as const;

    for (const selector of headerSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        observed.add(el);
        ro?.observe(el);
      }
    }

    const onLayoutChange = () => syncMobileChromeMetrics();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onLayoutChange);
    window.addEventListener("resize", onLayoutChange, { passive: true });
    window.addEventListener("orientationchange", onLayoutChange, { passive: true });

    const mo = new MutationObserver(() => {
      if (!document.querySelector("[data-app-root]")) return;
      syncMobileChromeMetrics();
      if (!ro) return;
      for (const selector of headerSelectors) {
        const el = document.querySelector(selector);
        if (el && !observed.has(el)) {
          observed.add(el);
          ro.observe(el);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      ro?.disconnect();
      mo.disconnect();
      vv?.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("orientationchange", onLayoutChange);
      clearMobileChromeMetrics();
    };
  }, []);

  return null;
}
