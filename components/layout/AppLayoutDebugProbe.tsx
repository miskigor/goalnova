"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { isDev } from "@/lib/devLog";
import { logAppShellPageOverflowOffenders } from "@/lib/layout/detectHorizontalOverflow";

const PROBE_SELECTORS = [
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
  "[data-app-mobile-header]",
  "[data-app-bottom-nav]",
  "[data-profile-shell]",
  "[data-messages-inbox]",
  "[data-messages-thread]",
  "[data-account-menu]",
  "[data-account-menu-backdrop]",
  "[data-scout-ai-insight]",
  "[data-public-video-detail]",
].join(",");

const OUTLINE_CSS = `
  [data-app-root],
  [data-app-column],
  [data-app-main],
  [data-app-main-inner],
  [data-app-mobile-header],
  [data-app-bottom-nav],
  [data-profile-shell],
  [data-messages-inbox],
  [data-messages-thread],
  [data-account-menu],
  [data-account-menu-backdrop],
  [data-scout-ai-insight],
  [data-public-video-detail] {
    outline: 1px dashed rgba(249, 115, 22, 0.35);
    outline-offset: -1px;
  }
`;

const SCAN_DELAYS_MS = [0, 500, 1500] as const;

/**
 * Development-only: outline main wrappers + log horizontal overflow on app routes.
 */
export function AppLayoutDebugProbe() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    const style = document.createElement("style");
    style.setAttribute("data-gn-layout-debug", "");
    style.textContent = OUTLINE_CSS;
    document.head.appendChild(style);

    const runProbe = () => {
      const viewportWidth = window.innerWidth;
      document.querySelectorAll(PROBE_SELECTORS).forEach((node) => {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        const overflow = el.scrollWidth > el.clientWidth + 1;
        const offset = el.offsetLeft < -1;
        const pastViewport = rect.right > viewportWidth + 1 || rect.left < -1;
        if (!overflow && !offset && !pastViewport) return;
        console.warn("[layout-debug] suspect wrapper", {
          pathname,
          tag: el.tagName,
          dataset: { ...el.dataset },
          offsetLeft: el.offsetLeft,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          rectLeft: rect.left,
          rectRight: rect.right,
          viewportWidth,
        });
      });
      logAppShellPageOverflowOffenders(pathname, viewportWidth);
    };

    const timeoutIds = SCAN_DELAYS_MS.map((delay) =>
      window.setTimeout(runProbe, delay),
    );
    window.addEventListener("resize", runProbe);
    return () => {
      for (const id of timeoutIds) window.clearTimeout(id);
      window.removeEventListener("resize", runProbe);
      style.remove();
    };
  }, [pathname]);

  return null;
}
