"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { devLog, devTable, isDev } from "@/lib/devLog";

const GN_MOBILE_VISUAL_BOTTOM_INSET_VAR = "--gn-mobile-visual-bottom-inset";
const GN_MOBILE_CHROME_BOTTOM_TOP_VAR = "--gn-mobile-chrome-bottom-top";

/** Fallback nav band height until the bottom wrap is measured. */
const BOTTOM_CHROME_FALLBACK_HEIGHT_PX = 56;

type ChromeDiag = {
  route: string;
  bottomWrapInDom: boolean;
  bottomNavInDom: boolean;
  wrapDisplay: string;
  wrapOpacity: string;
  wrapZIndex: string;
  wrapBottom: string;
  wrapTop: string;
  vvPositioned: boolean;
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

function collectChromeDiag(bottomWrap: HTMLElement | null): ChromeDiag {
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

  return {
    route: typeof window !== "undefined" ? window.location.pathname : "",
    bottomWrapInDom: Boolean(wrapEl),
    bottomNavInDom: Boolean(navEl),
    wrapDisplay: wrapCs?.display ?? "—",
    wrapOpacity: wrapCs?.opacity ?? "—",
    wrapZIndex: wrapCs?.zIndex ?? "—",
    wrapBottom: wrapCs?.bottom ?? "—",
    wrapTop: wrapCs?.top ?? "—",
    vvPositioned: wrapEl?.getAttribute("data-vv-positioned") === "true",
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

function logChromeDiag(bottomWrap: HTMLElement | null, reason: string) {
  if (!isDev) return;
  const diag = collectChromeDiag(bottomWrap);
  devLog(`[gn-chrome] ${reason}`, diag);
  devTable([diag]);
}

/**
 * Keep portaled bottom chrome inside the visual viewport (WhatsApp / iOS in-app browsers).
 * Uses bottom inset when reported; otherwise pins with top = visualViewport bottom − nav height.
 */
function syncBottomChromeGeometry(bottomWrap: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const vv = window.visualViewport;

  if (!vv) {
    root.style.setProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR, "0px");
    root.style.removeProperty(GN_MOBILE_CHROME_BOTTOM_TOP_VAR);
    bottomWrap?.removeAttribute("data-vv-positioned");
    return;
  }

  const layoutBottomGap = Math.max(
    0,
    window.innerHeight - (vv.offsetTop + vv.height),
  );
  root.style.setProperty(
    GN_MOBILE_VISUAL_BOTTOM_INSET_VAR,
    `${Math.ceil(layoutBottomGap)}px`,
  );

  if (!bottomWrap) return;

  const navHeight =
    bottomWrap.getBoundingClientRect().height || BOTTOM_CHROME_FALLBACK_HEIGHT_PX;
  const topPx = Math.max(0, vv.offsetTop + vv.height - navHeight);
  root.style.setProperty(GN_MOBILE_CHROME_BOTTOM_TOP_VAR, `${Math.ceil(topPx)}px`);

  const visualSmallerThanLayout =
    vv.height > 0 && vv.height < window.innerHeight - 8;
  const insetUnreliable = layoutBottomGap < 8 && visualSmallerThanLayout;

  if (insetUnreliable) {
    bottomWrap.setAttribute("data-vv-positioned", "true");
  } else {
    bottomWrap.removeAttribute("data-vv-positioned");
  }
}

function clearBottomChromeGeometry() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
  root.style.removeProperty(GN_MOBILE_CHROME_BOTTOM_TOP_VAR);
}

/**
 * Renders mobile header + tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const [mounted, setMounted] = useState(false);
  const bottomWrapRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    syncBottomChromeGeometry(bottomWrapRef.current);
    logChromeDiag(bottomWrapRef.current, "layout");
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const bottomWrap = bottomWrapRef.current;
    if (!bottomWrap) return;

    const run = () => {
      syncBottomChromeGeometry(bottomWrap);
      logChromeDiag(bottomWrap, "viewport");
    };

    run();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => run())
        : null;
    ro?.observe(bottomWrap);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", run);
    vv?.addEventListener("scroll", run);
    window.addEventListener("resize", run, { passive: true });

    if (isDev) {
      (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag =
        () => collectChromeDiag(bottomWrap);
    }

    return () => {
      ro?.disconnect();
      vv?.removeEventListener("resize", run);
      vv?.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
      clearBottomChromeGeometry();
      if (isDev) {
        delete (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag;
      }
    };
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="top"
        className="pointer-events-auto fixed inset-x-0 top-0 z-[1000] box-border w-full max-w-full min-w-0 overflow-x-clip max-lg:block lg:hidden"
        style={{ transform: "translateZ(0)" }}
      >
        <AppMobileHeader />
      </div>
      <div
        ref={bottomWrapRef}
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="bottom"
        className="pointer-events-auto fixed inset-x-0 z-[1000] box-border w-full max-w-full min-w-0 overflow-x-clip max-lg:block lg:hidden"
        style={{ transform: "translateZ(0)" }}
      >
        <AppMobileBottomNav />
      </div>
    </>,
    document.body,
  );
}
