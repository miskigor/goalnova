"use client";

import { useEffect } from "react";
import { isDev } from "@/lib/devLog";
import { logHorizontalOverflowOffenders } from "@/lib/layout/detectHorizontalOverflow";

const PROBE_SELECTORS = [
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-app-mobile-header]",
  "[data-profile-shell]",
].join(",");

const OUTLINE_CSS = `
  [data-app-root],
  [data-app-column],
  [data-app-main],
  [data-app-main-inner],
  [data-app-mobile-header],
  [data-profile-shell] {
    outline: 1px dashed rgba(249, 115, 22, 0.35);
    outline-offset: -1px;
  }
`;

/**
 * Development-only: outline main wrappers + log horizontal overflow / negative offsetLeft.
 */
export function AppLayoutDebugProbe() {
  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    const style = document.createElement("style");
    style.setAttribute("data-gn-layout-debug", "");
    style.textContent = OUTLINE_CSS;
    document.head.appendChild(style);

    const probe = () => {
      document.querySelectorAll(PROBE_SELECTORS).forEach((node) => {
        const el = node as HTMLElement;
        const overflow = el.scrollWidth > el.clientWidth + 1;
        const offset = el.offsetLeft < -1;
        if (!overflow && !offset) return;
        console.warn("[layout-debug] suspect wrapper", {
          tag: el.tagName,
          dataset: { ...el.dataset },
          offsetLeft: el.offsetLeft,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        });
      });
    };

    const runProbe = () => {
      probe();
      logHorizontalOverflowOffenders(document.body, 20);
    };

    runProbe();
    const t0 = window.setTimeout(runProbe, 0);
    const t1 = window.setTimeout(runProbe, 500);
    const t2 = window.setTimeout(runProbe, 1500);
    window.addEventListener("resize", runProbe);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", runProbe);
      style.remove();
    };
  }, []);

  return null;
}
