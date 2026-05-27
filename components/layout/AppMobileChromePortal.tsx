"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/i18n/navigation";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { devLog, devTable, isDev } from "@/lib/devLog";
import { normalizeAppPathname } from "@/lib/layout/normalizeAppPathname";

const GN_MOBILE_VISUAL_BOTTOM_INSET_VAR = "--gn-mobile-visual-bottom-inset";

type ChromeDiag = {
  route: string;
  pathnameNormalized: string;
  bottomNavInDom: boolean;
  bottomNavRectTop: number;
  bottomNavRectBottom: number;
  innerHeight: number;
  vvHeight: number;
  vvOffsetTop: number;
  wrapComputedBottom: string;
  wrapComputedZIndex: string;
  navComputedBottom: string;
  navComputedZIndex: string;
  belowVisualViewport: boolean;
};

function rectOf(el: HTMLElement | null): { top: number; bottom: number } {
  if (!el) return { top: -1, bottom: -1 };
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
}

function collectChromeDiag(
  bottomWrap: HTMLElement | null,
  pathnameNormalized: string,
): ChromeDiag {
  const vv = window.visualViewport;
  const vvh = vv?.height ?? 0;
  const vvt = vv?.offsetTop ?? 0;
  const visibleBottom = vvt + vvh;
  const bottomNav = document.querySelector("[data-app-bottom-nav]");
  const navEl = bottomNav instanceof HTMLElement ? bottomNav : null;
  const navRect = rectOf(navEl);
  const belowVisualViewport = navEl ? navRect.top >= visibleBottom - 1 : true;
  const wrapCs = bottomWrap ? getComputedStyle(bottomWrap) : null;
  const navCs = navEl ? getComputedStyle(navEl) : null;

  return {
    route: window.location.pathname,
    pathnameNormalized,
    bottomNavInDom: Boolean(navEl),
    bottomNavRectTop: navRect.top,
    bottomNavRectBottom: navRect.bottom,
    innerHeight: window.innerHeight,
    vvHeight: Math.round(vvh),
    vvOffsetTop: Math.round(vvt),
    wrapComputedBottom: wrapCs?.bottom ?? "—",
    wrapComputedZIndex: wrapCs?.zIndex ?? "—",
    navComputedBottom: navCs?.bottom ?? "—",
    navComputedZIndex: navCs?.zIndex ?? "—",
    belowVisualViewport,
  };
}

function logHomeChromeDiag(
  bottomWrap: HTMLElement | null,
  pathnameNormalized: string,
  reason: string,
) {
  if (!isDev || pathnameNormalized !== "/home") return;
  const diag = collectChromeDiag(bottomWrap, pathnameNormalized);
  devLog(`[gn-chrome/home] ${reason}`, diag);
  devTable([diag]);
}

/** Shell content band only — never moves the portaled tab bar. */
function syncContentVisualBottomInset() {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const vv = window.visualViewport;

  if (!vv) {
    root.style.setProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR, "0px");
    return;
  }

  const layoutBottomGap = Math.min(
    120,
    Math.max(0, window.innerHeight - (vv.offsetTop + vv.height)),
  );
  root.style.setProperty(
    GN_MOBILE_VISUAL_BOTTOM_INSET_VAR,
    `${Math.ceil(layoutBottomGap)}px`,
  );
}

/** Pin portaled tab bar to layout viewport bottom — independent of home feed state. */
function pinBottomNavToViewport(bottomWrap: HTMLElement | null) {
  if (!bottomWrap) return;

  bottomWrap.removeAttribute("data-vv-positioned");
  bottomWrap.style.removeProperty("top");
  bottomWrap.style.setProperty("position", "fixed", "important");
  bottomWrap.style.setProperty("bottom", "0", "important");
  bottomWrap.style.setProperty("left", "0", "important");
  bottomWrap.style.setProperty("right", "0", "important");
  bottomWrap.style.setProperty("z-index", "1000", "important");
  bottomWrap.style.setProperty("width", "100%", "important");
}

function syncContentChromeOnly() {
  syncContentVisualBottomInset();
}

/**
 * Renders mobile bottom tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const pathname = normalizeAppPathname(usePathname());
  const bottomWrapRef = useRef<HTMLDivElement | null>(null);
  const isHome = pathname === "/home";

  const pinNav = () => {
    pinBottomNavToViewport(bottomWrapRef.current);
  };

  useLayoutEffect(() => {
    pinNav();
    syncContentChromeOnly();
    logHomeChromeDiag(bottomWrapRef.current, pathname, "layout");

    const raf1 = window.requestAnimationFrame(() => {
      pinNav();
      logHomeChromeDiag(bottomWrapRef.current, pathname, "layout-raf");
    });

    const homeBurstIds: number[] = [];
    if (isHome) {
      for (const delay of [0, 50, 100, 250, 500]) {
        homeBurstIds.push(
          window.setTimeout(() => {
            pinNav();
            logHomeChromeDiag(bottomWrapRef.current, pathname, `home-pin-${delay}ms`);
          }, delay),
        );
      }
    }

    return () => {
      window.cancelAnimationFrame(raf1);
      for (const id of homeBurstIds) {
        window.clearTimeout(id);
      }
    };
  }, [pathname, isHome]);

  useEffect(() => {
    const bottomWrap = bottomWrapRef.current;
    if (!bottomWrap) return;

    pinNav();
    syncContentChromeOnly();
    logHomeChromeDiag(bottomWrap, pathname, "mount");

    const onViewportChange = () => {
      syncContentChromeOnly();
      pinNav();
    };
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange, { passive: true });

    let mo: MutationObserver | null = null;
    const mainEl = document.querySelector("[data-app-main]");
    if (mainEl && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => {
        pinNav();
      });
      mo.observe(mainEl, { childList: true, subtree: true });
    }

    let homeLogIntervalId = 0;
    if (isDev && isHome) {
      homeLogIntervalId = window.setInterval(() => {
        logHomeChromeDiag(bottomWrap, pathname, "home-interval");
      }, 2000);
    }

    if (isDev) {
      (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag =
        () => collectChromeDiag(bottomWrap, pathname);
    }

    return () => {
      mo?.disconnect();
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      if (homeLogIntervalId) window.clearInterval(homeLogIntervalId);
      if (isDev) {
        delete (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag;
      }
    };
  }, [pathname, isHome]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={bottomWrapRef}
      data-app-mobile-chrome
      data-app-mobile-chrome-fixed="bottom"
      className="pointer-events-auto visible fixed inset-x-0 bottom-0 z-[1000] box-border min-h-[var(--gn-app-bottom-nav-offset,4.5rem)] w-full max-w-full min-w-0 overflow-x-clip overflow-y-visible opacity-100 max-lg:block lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transform: "translateZ(0)",
      }}
    >
      <AppMobileBottomNav />
    </div>,
    document.body,
  );
}
