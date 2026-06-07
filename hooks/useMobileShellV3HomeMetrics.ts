"use client";

import { useLayoutEffect } from "react";
import { MLV3_ROOT_ATTR } from "@/components/layout/mobile-v3/mobileLayoutV3.tokens";

const MLV3_HOME_MOCK_MAIN_SELECTOR =
  '[data-mlv3-main][data-mlv3-route="home-mock"]';
const MIN_TOP_GAP_PX = 24;
const MIN_BOTTOM_GAP_PX = 24;
const CARD_HORIZONTAL_INSET_PX = 72;
const HEIGHT_FIT_MARGIN_PX = 24;
const MOBILE_CARD_MAX_WIDTH_PX = 240;
const DESKTOP_CARD_MAX_WIDTH_PX = 280;
const MOBILE_MAIN_WIDTH_THRESHOLD_PX = 430;

export type HomeMockMetricsSnapshot = {
  clientWidth: number;
  mainHeight: number;
  availableHeight: number;
  topGap: number;
  bottomGap: number;
  cardTargetWidth: number;
  cardTargetHeight: number;
  cardWidth: number;
  cardHeight: number;
};

function cardMaxWidthPx(mainWidth: number): number {
  return mainWidth <= MOBILE_MAIN_WIDTH_THRESHOLD_PX
    ? MOBILE_CARD_MAX_WIDTH_PX
    : DESKTOP_CARD_MAX_WIDTH_PX;
}

/** Card width from main area only — not viewport/window width. */
function readMainInnerWidth(mainEl: HTMLElement): number {
  return Math.max(0, Math.round(mainEl.clientWidth));
}

export function applyHomeMockMetrics(
  mainEl: HTMLElement,
): HomeMockMetricsSnapshot | null {
  const root =
    mainEl.closest<HTMLElement>(`[${MLV3_ROOT_ATTR}]`) ??
    document.querySelector<HTMLElement>(`[${MLV3_ROOT_ATTR}]`);
  if (!root) return null;

  const mainHeight = Math.max(0, Math.round(mainEl.clientHeight));
  const mainWidth = readMainInnerWidth(mainEl);
  const topGap = MIN_TOP_GAP_PX;
  const bottomGap = MIN_BOTTOM_GAP_PX;
  const availableHeight = Math.max(0, mainHeight - topGap - bottomGap);
  const maxCardWidth = cardMaxWidthPx(mainWidth);
  const widthFromMain = Math.max(0, mainWidth - CARD_HORIZONTAL_INSET_PX);
  const widthFromHeight =
    availableHeight > 0 ? (availableHeight * 9) / 16 : widthFromMain;

  let cardTargetWidth = Math.min(widthFromMain, widthFromHeight, maxCardWidth);
  let cardTargetHeight = (cardTargetWidth * 16) / 9;

  if (cardTargetHeight > availableHeight) {
    cardTargetHeight = Math.max(0, availableHeight - HEIGHT_FIT_MARGIN_PX);
    cardTargetWidth = (cardTargetHeight * 9) / 16;
  }

  const cardWidth = Math.max(0, Math.round(cardTargetWidth));
  const cardHeight = Math.max(0, Math.round((cardWidth * 16) / 9));

  root.style.setProperty("--mlv3-mock-item-height", `${mainHeight}px`);
  root.style.setProperty("--mlv3-mock-card-width", `${cardWidth}px`);
  root.style.setProperty("--mlv3-mock-card-height", `${cardHeight}px`);
  root.style.setProperty("--mlv3-mock-top-gap", `${topGap}px`);
  root.style.setProperty("--mlv3-mock-bottom-gap", `${bottomGap}px`);

  return {
    clientWidth: mainWidth,
    mainHeight,
    availableHeight,
    topGap,
    bottomGap,
    cardTargetWidth: Math.round(cardTargetWidth * 10) / 10,
    cardTargetHeight: Math.round(cardTargetHeight * 10) / 10,
    cardWidth,
    cardHeight,
  };
}

const MOCK_SCROLL_RESET_SELECTORS = [
  "[data-mlv3-root]",
  "[data-mlv3-column]",
  "[data-mlv3-main]",
  "[data-mlv3-scroll]",
  "[data-mlv3-home-mock-feed]",
  "[data-mlv3-home-mock-scroll-root]",
] as const;

export function resetHomeMockV3HorizontalScroll(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;

  for (const selector of MOCK_SCROLL_RESET_SELECTORS) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLElement) node.scrollLeft = 0;
    });
  }
}

/**
 * Sets stable mock feed dimensions once on mount (+ orientation change).
 * No continuous resize listener — avoids post-hydrate card jumps.
 */
export function useMobileShellV3HomeMockMetrics(enabled: boolean): void {
  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const run = () => {
      const mainEl = document.querySelector<HTMLElement>(
        MLV3_HOME_MOCK_MAIN_SELECTOR,
      );
      if (!mainEl) return;
      applyHomeMockMetrics(mainEl);
      resetHomeMockV3HorizontalScroll();
    };

    run();
    window.addEventListener("orientationchange", run, { passive: true });
    return () => {
      window.removeEventListener("orientationchange", run);
    };
  }, [enabled]);
}
