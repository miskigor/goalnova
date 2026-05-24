"use client";

import { useEffect } from "react";
import { resetAppMobileHorizontalScroll } from "@/lib/layout/appMobileHorizontalScrollReset";

const HEADER_OFFSET_VAR = "--gn-app-header-offset";
const BOTTOM_OFFSET_VAR = "--gn-app-bottom-nav-offset";

function measureChromeOffsets(): void {
  if (typeof document === "undefined") return;

  const header = document.querySelector("[data-app-mobile-header]");
  const bottomNav = document.querySelector("[data-app-bottom-nav]");

  if (header instanceof HTMLElement) {
    const h = Math.ceil(header.getBoundingClientRect().height);
    if (h > 0) {
      document.documentElement.style.setProperty(HEADER_OFFSET_VAR, `${h}px`);
    }
  }

  if (bottomNav instanceof HTMLElement) {
    const h = Math.ceil(bottomNav.getBoundingClientRect().height);
    if (h > 0) {
      document.documentElement.style.setProperty(BOTTOM_OFFSET_VAR, `${h}px`);
    }
  }
}

/**
 * Keeps portaled header + bottom tab bar aligned to the viewport: measured inset vars,
 * no horizontal drift on body, both chrome layers always accounted for in the content band.
 */
export function AppMobileChromeMetrics() {
  useEffect(() => {
    const run = () => {
      resetAppMobileHorizontalScroll();
      measureChromeOffsets();
    };

    run();
    const t0 = window.setTimeout(run, 0);
    const t50 = window.setTimeout(run, 50);
    const t200 = window.setTimeout(run, 200);

    const ro = new ResizeObserver(run);
    const header = document.querySelector("[data-app-mobile-header]");
    const bottomNav = document.querySelector("[data-app-bottom-nav]");
    if (header instanceof HTMLElement) ro.observe(header);
    if (bottomNav instanceof HTMLElement) ro.observe(bottomNav);

    window.addEventListener("resize", run, { passive: true });
    window.visualViewport?.addEventListener("resize", run);
    window.visualViewport?.addEventListener("scroll", run);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t50);
      window.clearTimeout(t200);
      ro.disconnect();
      window.removeEventListener("resize", run);
      window.visualViewport?.removeEventListener("resize", run);
      window.visualViewport?.removeEventListener("scroll", run);
    };
  }, []);

  return null;
}
