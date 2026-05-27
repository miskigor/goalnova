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
  bottomWrapInDom: boolean;
  bottomNavInDom: boolean;
  isVisible: boolean;
  wrapDisplay: string;
  wrapOpacity: string;
  wrapZIndex: string;
  wrapBottom: string;
  wrapTop: string;
  navItemCount: number;
  visualBottomInset: string;
  innerHeight: number;
  vvHeight: number;
  vvOffsetTop: number;
  wrapRect: string;
  navRect: string;
  belowVisualViewport: boolean;
};

function formatRect(el: HTMLElement | null): string {
  if (!el) return "—";
  const r = el.getBoundingClientRect();
  return `t${Math.round(r.top)} b${Math.round(r.bottom)} h${Math.round(r.height)}`;
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
  const wrapEl = bottomWrap;
  const navRect = navEl?.getBoundingClientRect();
  const belowVisualViewport = navRect ? navRect.top >= visibleBottom - 1 : true;
  const wrapCs = wrapEl ? getComputedStyle(wrapEl) : null;
  const wrapDisplay = wrapCs?.display ?? "—";
  const wrapOpacity = wrapCs?.opacity ?? "—";

  return {
    route: typeof window !== "undefined" ? window.location.pathname : "",
    pathnameNormalized,
    bottomWrapInDom: Boolean(wrapEl),
    bottomNavInDom: Boolean(navEl),
    isVisible:
      Boolean(navEl) &&
      wrapDisplay !== "none" &&
      wrapOpacity !== "0" &&
      !belowVisualViewport,
    wrapDisplay,
    wrapOpacity,
    wrapZIndex: wrapCs?.zIndex ?? "—",
    wrapBottom: wrapCs?.bottom ?? "—",
    wrapTop: wrapCs?.top ?? "—",
    navItemCount: navEl?.querySelectorAll("a").length ?? 0,
    visualBottomInset: getComputedStyle(document.documentElement)
      .getPropertyValue(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR)
      .trim(),
    innerHeight: window.innerHeight,
    vvHeight: Math.round(vvh),
    vvOffsetTop: Math.round(vvt),
    wrapRect: formatRect(wrapEl),
    navRect: formatRect(navEl),
    belowVisualViewport,
  };
}

function logChromeDiag(
  bottomWrap: HTMLElement | null,
  pathnameNormalized: string,
  reason: string,
) {
  if (!isDev) return;
  const diag = collectChromeDiag(bottomWrap, pathnameNormalized);
  devLog(`[gn-chrome] ${reason}`, diag);
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

/** Pin portaled tab bar to layout viewport bottom — never use visual inset for nav position. */
function pinBottomNavToViewport(bottomWrap: HTMLElement | null) {
  if (!bottomWrap) return;

  bottomWrap.removeAttribute("data-vv-positioned");
  bottomWrap.style.removeProperty("top");
  bottomWrap.style.setProperty("bottom", "0", "important");
  bottomWrap.style.setProperty("left", "0", "important");
  bottomWrap.style.setProperty("right", "0", "important");
}

function syncBottomChromeGeometry(bottomWrap: HTMLElement | null) {
  syncContentVisualBottomInset();
  pinBottomNavToViewport(bottomWrap);
}

/**
 * Renders mobile bottom tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const pathname = normalizeAppPathname(usePathname());
  const bottomWrapRef = useRef<HTMLDivElement | null>(null);

  const syncChrome = () => {
    syncBottomChromeGeometry(bottomWrapRef.current);
  };

  useLayoutEffect(() => {
    syncChrome();
    logChromeDiag(bottomWrapRef.current, pathname, "layout");
    const raf1 = window.requestAnimationFrame(() => {
      syncChrome();
      logChromeDiag(bottomWrapRef.current, pathname, "layout-raf");
    });

    const homeBurstIds: number[] = [];
    if (pathname === "/home") {
      for (const delay of [0, 50, 250]) {
        homeBurstIds.push(
          window.setTimeout(() => {
            syncChrome();
            if (document.querySelector("[data-pitchrusch-home-feed]")) {
              logChromeDiag(bottomWrapRef.current, pathname, "home-feed-ready");
            }
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
  }, [pathname]);

  useEffect(() => {
    const bottomWrap = bottomWrapRef.current;
    if (!bottomWrap) return;

    const run = (reason: string) => {
      syncBottomChromeGeometry(bottomWrap);
      if (reason === "pathname" || reason === "home-feed") {
        logChromeDiag(bottomWrap, pathname, reason);
      }
    };

    run("pathname");

    if (document.querySelector("[data-pitchrusch-home-feed]")) {
      run("home-feed");
    }

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncBottomChromeGeometry(bottomWrap))
        : null;
    ro?.observe(bottomWrap);

    const onViewportChange = () => syncBottomChromeGeometry(bottomWrap);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange, { passive: true });

    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            run("home-feed");
          })
        : null;
    mo?.observe(document.body, { childList: true, subtree: true });

    if (isDev) {
      (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag =
        () => collectChromeDiag(bottomWrap, pathname);
    }

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      if (isDev) {
        delete (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag;
      }
    };
  }, [pathname]);

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
        transform: "translateZ(0)",
        zIndex: 1000,
      }}
    >
      <AppMobileBottomNav />
    </div>,
    document.body,
  );
}
