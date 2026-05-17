"use client";

import { useEffect } from "react";
import { isDev } from "@/lib/devLog";

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

    probe();
    const t = window.setTimeout(probe, 500);
    window.addEventListener("resize", probe);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", probe);
      style.remove();
    };
  }, []);

  return null;
}
