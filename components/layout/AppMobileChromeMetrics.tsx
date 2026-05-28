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

/** Space to reserve above the fixed tab bar (full mount band in the visual viewport). */
function measureBottomChromeInsetPx(): number {
  const mount = document.querySelector("[data-app-mobile-bottom-nav-mount]");
  const nav = document.querySelector("[data-app-bottom-nav]");
  const vv = window.visualViewport;
  const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;

  let reservePx = 0;

  if (mount instanceof HTMLElement) {
    const rect = mount.getBoundingClientRect();
    if (Number.isFinite(rect.top)) {
      reservePx = Math.max(reservePx, Math.ceil(viewportBottom - rect.top));
    }
    if (Number.isFinite(rect.height)) {
      reservePx = Math.max(reservePx, Math.ceil(rect.height));
    }
  }

  if (nav instanceof HTMLElement) {
    const navRect = nav.getBoundingClientRect();
    if (Number.isFinite(navRect.top)) {
      reservePx = Math.max(
        reservePx,
        Math.ceil(viewportBottom - navRect.top),
        Math.ceil(window.innerHeight - navRect.top),
      );
    }
  }

  return reservePx;
}

function measureVisualBottomInsetPx(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.ceil(window.innerHeight - (vv.offsetTop + vv.height)));
}

function isPremiumFitPage(): boolean {
  return Boolean(document.querySelector("[data-premium-fit-viewport]"));
}

function syncMobileChromeMetrics() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const isHomeFeed = Boolean(document.querySelector("[data-pitchrusch-home-feed]"));
  const isPremium = isPremiumFitPage();
  if (isHomeFeed) {
    root.style.removeProperty(GN_HEADER_OFFSET_MEASURED);
    root.style.removeProperty(GN_BOTTOM_NAV_OFFSET_MEASURED);
    root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
    root.style.removeProperty(GN_PREMIUM_SAFE_TOP_VAR);
    return;
  }

  const headerPx = measureTopChromeInsetPx();
  const vv = window.visualViewport;
  let layoutBottomGap = measureVisualBottomInsetPx();
  const premiumSafeTopPx = isPremium && vv ? Math.max(0, Math.ceil(vv.offsetTop)) : 0;

  if (isPremium) {
    layoutBottomGap = Math.max(layoutBottomGap, 8);
  }

  root.style.setProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR, `${Math.ceil(layoutBottomGap)}px`);

  let bottomPx = measureBottomChromeInsetPx();
  if (isPremium) {
    const premiumBottomMinPx = 84;
    bottomPx = Math.max(bottomPx, premiumBottomMinPx + layoutBottomGap);
  }

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

  if (isPremium) {
    root.style.setProperty(GN_PREMIUM_SAFE_TOP_VAR, `${premiumSafeTopPx}px`);
  } else {
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

    const onViewportResize = () => syncMobileChromeMetrics();
    const onViewportScroll = () => {
      if (!isPremiumFitPage()) syncMobileChromeMetrics();
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportResize);
    vv?.addEventListener("scroll", onViewportScroll);
    window.addEventListener("resize", onViewportResize, { passive: true });

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
      vv?.removeEventListener("resize", onViewportResize);
      vv?.removeEventListener("scroll", onViewportScroll);
      window.removeEventListener("resize", onViewportResize);
      clearMobileChromeMetrics();
    };
  }, []);

  return null;
}
