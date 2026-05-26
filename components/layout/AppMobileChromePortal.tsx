"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/i18n/navigation";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { devLog, devTable, isDev } from "@/lib/devLog";

const GN_MOBILE_VISUAL_BOTTOM_INSET_VAR = "--gn-mobile-visual-bottom-inset";

type ChromeDiag = {
  route: string;
  bottomWrapInDom: boolean;
  bottomNavInDom: boolean;
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

/** Content inset only — nav stays `bottom: 0` (never `data-vv-positioned` top pin). */
function syncBottomChromeGeometry(bottomWrap: HTMLElement | null) {
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

  if (!bottomWrap) return;

  bottomWrap.removeAttribute("data-vv-positioned");
  bottomWrap.style.removeProperty("top");
  // globals.css sets bottom from --gn-mobile-visual-bottom-inset (!important) — that inset is
  // for shell content padding only; pin the portaled tab bar to the viewport bottom.
  bottomWrap.style.setProperty("bottom", "0", "important");
}

/**
 * Renders mobile bottom tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const pathname = usePathname();
  const bottomWrapRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    syncBottomChromeGeometry(bottomWrapRef.current);
    logChromeDiag(bottomWrapRef.current, "layout");
  }, [pathname]);

  useEffect(() => {
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

    // Home feed remounts after /benefits, /premium, etc. — re-pin bottom nav once feed is in DOM.
    const mo =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            if (document.querySelector("[data-pitchrusch-home-feed]")) {
              run();
            }
          })
        : null;
    mo?.observe(document.body, { childList: true, subtree: true });

    if (isDev) {
      (window as Window & { __gnChromeDiag?: () => ChromeDiag }).__gnChromeDiag =
        () => collectChromeDiag(bottomWrap);
    }

    return () => {
      ro?.disconnect();
      mo?.disconnect();
      vv?.removeEventListener("resize", run);
      vv?.removeEventListener("scroll", run);
      window.removeEventListener("resize", run);
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
      className="pointer-events-auto visible fixed start-0 end-0 z-[1000] box-border min-h-[var(--gn-app-bottom-nav-offset,4.5rem)] w-full max-w-full min-w-0 overflow-x-clip overflow-y-visible opacity-100 !bottom-0 max-lg:block lg:hidden pb-[env(safe-area-inset-bottom,0px)]"
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
