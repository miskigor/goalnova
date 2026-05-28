"use client";

import { useLayoutEffect } from "react";

const GN_HEADER_OFFSET_MEASURED = "--gn-app-header-offset-measured";
const GN_BOTTOM_NAV_OFFSET_MEASURED = "--gn-app-bottom-nav-offset-measured";
const GN_MOBILE_VISUAL_BOTTOM_INSET_VAR = "--gn-mobile-visual-bottom-inset";

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

/** Distance from layout viewport bottom to the top edge of the fixed tab bar. */
function measureBottomChromeInsetPx(): number {
  const nav = document.querySelector("[data-app-bottom-nav]");
  if (nav instanceof HTMLElement) {
    const top = nav.getBoundingClientRect().top;
    if (Number.isFinite(top)) {
      return Math.max(0, Math.ceil(window.innerHeight - top));
    }
  }
  const mount = document.querySelector("[data-app-mobile-bottom-nav-mount]");
  if (!(mount instanceof HTMLElement)) return 0;
  const top = mount.getBoundingClientRect().top;
  if (!Number.isFinite(top)) return 0;
  return Math.max(0, Math.ceil(window.innerHeight - top));
}

function syncMobileChromeMetrics() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const isHomeFeed = Boolean(document.querySelector("[data-pitchrusch-home-feed]"));
  if (isHomeFeed) {
    root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
    root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);
    root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
    return;
  }

  const headerPx = measureTopChromeInsetPx();
  const bottomPx = measureBottomChromeInsetPx();

  const vv = window.visualViewport;
  const layoutBottomGap = vv
    ? Math.max(0, window.innerHeight - (vv.offsetTop + vv.height))
    : 0;

  if (headerPx > 0) {
    root.style.setProperty(GN_HEADER_OFFSET_MEASURED, `${headerPx}px`);
  } else {
    root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
  }

  if (bottomPx > 0) {
    root.style.setProperty(GN_BOTTOM_NAV_OFFSET_MEASURED, `${bottomPx}px`);
  } else {
    root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);
  }

  root.style.setProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR, `${Math.ceil(layoutBottomGap)}px`);
}

function clearMobileChromeMetrics() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
  root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);
  root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
}

/**
 * Writes measured header / bottom-nav insets for tab-page scroll band (non–home feed only).
 */
export function AppMobileChromeMetrics() {
  useLayoutEffect(() => {
    syncMobileChromeMetrics();

    const observed = new Set<Element>();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncMobileChromeMetrics())
        : null;

    const selectors = [
      '[data-app-mobile-chrome-fixed="top"]',
      "[data-app-mobile-header]",
      "[data-app-mobile-bottom-nav-mount]",
      "[data-app-bottom-nav]",
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        observed.add(el);
        ro?.observe(el);
      }
    }

    const onViewportChange = () => syncMobileChromeMetrics();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange, { passive: true });

    const mo = new MutationObserver(() => {
      syncMobileChromeMetrics();
      if (!ro) return;
      for (const selector of selectors) {
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
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      clearMobileChromeMetrics();
    };
  }, []);

  return null;
}
