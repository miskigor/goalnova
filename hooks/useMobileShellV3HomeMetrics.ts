"use client";

import { useLayoutEffect } from "react";
import { MLV3_ROOT_ATTR } from "@/components/layout/mobile-v3/mobileLayoutV3.tokens";

const MLV3_HOME_MOCK_MAIN_SELECTOR =
  '[data-mlv3-main][data-mlv3-route="home-mock"]';
const MLV3_HOME_FEED_MAIN_SELECTOR =
  '[data-mlv3-main][data-mlv3-route="home-feed"]';
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

export type HomeV3FeedMetricsLog = {
  cardWidth: number;
  cardHeight: number;
  cardRectWidth: number;
  cardRectHeight: number;
  cssWidth: string;
  cssHeight: string;
  mockVarWidth: string;
  mockVarHeight: string;
  cardRectTop: number;
  cardRectBottom: number;
  mainRectTop: number;
  mainRectBottom: number;
  topGap: number;
  bottomGap: number;
};

export function buildHomeV3FeedMetricsLog(
  mainEl: HTMLElement,
  metrics: HomeMockMetricsSnapshot | null,
): HomeV3FeedMetricsLog | null {
  if (!metrics) return null;
  const root =
    mainEl.closest<HTMLElement>(`[${MLV3_ROOT_ATTR}]`) ??
    document.querySelector<HTMLElement>(`[${MLV3_ROOT_ATTR}]`);
  if (!root) return null;

  const mainRect = mainEl.getBoundingClientRect();
  const cardEl = document.querySelector<HTMLElement>(
    '[data-mlv3-route="home-feed"] [data-mlv3-home-mock-card]',
  );
  const cardRect = cardEl?.getBoundingClientRect();
  const cardStyle = cardEl ? getComputedStyle(cardEl) : null;
  const mockVars = readHomeV3MockCssVars(root);

  return {
    cardWidth: metrics.cardWidth,
    cardHeight: metrics.cardHeight,
    cardRectWidth: Math.round((cardRect?.width ?? 0) * 10) / 10,
    cardRectHeight: Math.round((cardRect?.height ?? 0) * 10) / 10,
    cssWidth: cardStyle?.width ?? "",
    cssHeight: cardStyle?.height ?? "",
    mockVarWidth: mockVars.cardWidth,
    mockVarHeight: mockVars.cardHeight,
    cardRectTop: Math.round((cardRect?.top ?? 0) * 10) / 10,
    cardRectBottom: Math.round((cardRect?.bottom ?? 0) * 10) / 10,
    mainRectTop: Math.round(mainRect.top * 10) / 10,
    mainRectBottom: Math.round(mainRect.bottom * 10) / 10,
    topGap: metrics.topGap,
    bottomGap: metrics.bottomGap,
  };
}

export function readHomeV3MockCssVars(root: HTMLElement): {
  cardWidth: string;
  cardHeight: string;
  topGap: string;
  bottomGap: string;
  itemHeight: string;
} {
  const style = getComputedStyle(root);
  return {
    cardWidth: style.getPropertyValue("--mlv3-mock-card-width").trim(),
    cardHeight: style.getPropertyValue("--mlv3-mock-card-height").trim(),
    topGap: style.getPropertyValue("--mlv3-mock-top-gap").trim(),
    bottomGap: style.getPropertyValue("--mlv3-mock-bottom-gap").trim(),
    itemHeight: style.getPropertyValue("--mlv3-mock-item-height").trim(),
  };
}

/** Real feed debug route — locked card size (matches home-mock iPhone target). */
export const HOME_FEED_LOCKED_CARD_WIDTH_PX = 240;
export const HOME_FEED_LOCKED_CARD_HEIGHT_PX = 427;

/** Same locked dimensions as home-mock iPhone target — feed route only. */
export function applyHomeV3FeedMetrics(
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
  const cardWidth = HOME_FEED_LOCKED_CARD_WIDTH_PX;
  const cardHeight = HOME_FEED_LOCKED_CARD_HEIGHT_PX;

  root.style.setProperty("--mlv3-mock-item-height", `${mainHeight}px`);
  root.style.setProperty("--mlv3-mock-card-width", `${cardWidth}px`);
  root.style.setProperty("--mlv3-mock-card-height", `${cardHeight}px`);
  root.style.setProperty("--mlv3-mock-top-gap", `${topGap}px`);
  root.style.setProperty("--mlv3-mock-bottom-gap", `${bottomGap}px`);

  const availableHeight = Math.max(0, mainHeight - topGap - bottomGap);

  return {
    clientWidth: mainWidth,
    mainHeight,
    availableHeight,
    topGap,
    bottomGap,
    cardTargetWidth: cardWidth,
    cardTargetHeight: cardHeight,
    cardWidth,
    cardHeight,
  };
}

export function runHomeV3FeedMetrics(mainEl: HTMLElement | null): void {
  if (!mainEl) return;
  applyHomeV3FeedMetrics(mainEl);
  resetHomeMockV3HorizontalScroll();
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
  "[data-mlv3-home-feed]",
  "[data-mlv3-home-feed-scroll-root]",
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

/** Same locked card metrics as home-mock — re-runs when `layoutKey` changes (feed mounted). */
export function useMobileShellV3HomeFeedMetrics(
  enabled: boolean,
  layoutKey = 0,
): void {
  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const run = () => {
      const mainEl = document.querySelector<HTMLElement>(
        MLV3_HOME_FEED_MAIN_SELECTOR,
      );
      if (!mainEl) return;
      applyHomeV3FeedMetrics(mainEl);
      resetHomeMockV3HorizontalScroll();
    };

    run();
    window.addEventListener("orientationchange", run, { passive: true });
    return () => {
      window.removeEventListener("orientationchange", run);
    };
  }, [enabled, layoutKey]);
}
