"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "@/i18n/navigation";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import { normalizeAppPathname } from "@/lib/layout/normalizeAppPathname";
import { shouldRenderMobileBottomNav } from "@/lib/layout/mobileBottomNavVisibility";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { useNavSession } from "@/components/layout/useNavSession";

const GN_MOBILE_CHROME_BOTTOM_TOP = "--gn-mobile-chrome-bottom-top";
const GAP_TOLERANCE_PX = 4;
const POSITION_DELTA_THRESHOLD_PX = 4;
const VIEWPORT_SIZE_DELTA_THRESHOLD_PX = 8;
const RESIZE_DEBOUNCE_MS = 180;

type PositionMode = "bottom" | "top";

type NavPositionState = {
  mode: PositionMode;
  topPx: number | null;
  vvHeight: number;
  vvOffsetTop: number;
};

function visualViewportBottomPx(): number | null {
  const vv = window.visualViewport;
  if (!vv) return null;
  return vv.offsetTop + vv.height;
}

function clearTopPosition(mount: HTMLElement) {
  mount.removeAttribute("data-vv-positioned");
  mount.style.removeProperty("top");
  mount.style.bottom = "0";
  document.documentElement.style.removeProperty(GN_MOBILE_CHROME_BOTTOM_TOP);
}

function applyTopPosition(mount: HTMLElement, topPx: number) {
  mount.style.bottom = "auto";
  mount.style.top = `${topPx}px`;
  mount.setAttribute("data-vv-positioned", "true");
  document.documentElement.style.setProperty(GN_MOBILE_CHROME_BOTTOM_TOP, `${topPx}px`);
}

function measureGapToVisualViewportBottom(mount: HTMLElement): number | null {
  const vvBottom = visualViewportBottomPx();
  if (vvBottom == null) return null;
  return vvBottom - mount.getBoundingClientRect().bottom;
}

function applyBottomNavPosition(
  mount: HTMLElement,
  state: NavPositionState,
  { force = false }: { force?: boolean } = {},
): NavPositionState {
  const vv = window.visualViewport;
  if (!vv) {
    clearTopPosition(mount);
    return { mode: "bottom", topPx: null, vvHeight: 0, vvOffsetTop: 0 };
  }

  const vvHeight = vv.height;
  const vvOffsetTop = vv.offsetTop;
  const heightDelta = Math.abs(vvHeight - state.vvHeight);
  const offsetDelta = Math.abs(vvOffsetTop - state.vvOffsetTop);
  const viewportChangedSignificantly =
    heightDelta >= VIEWPORT_SIZE_DELTA_THRESHOLD_PX ||
    offsetDelta >= VIEWPORT_SIZE_DELTA_THRESHOLD_PX;

  if (
    !force &&
    state.topPx != null &&
    state.mode === "top" &&
    !viewportChangedSignificantly
  ) {
    return state;
  }

  if (!force && state.mode === "bottom" && state.topPx == null && !viewportChangedSignificantly) {
    const gap = measureGapToVisualViewportBottom(mount);
    if (gap != null && Math.abs(gap) <= GAP_TOLERANCE_PX) {
      return { ...state, vvHeight, vvOffsetTop };
    }
  }

  if (state.mode !== "top") {
    mount.style.top = "auto";
    mount.style.bottom = "0";
  }

  const gap = measureGapToVisualViewportBottom(mount);
  if (gap == null) {
    return state;
  }

  if (Math.abs(gap) <= GAP_TOLERANCE_PX) {
    if (state.mode === "bottom" && !force) {
      return { mode: "bottom", topPx: null, vvHeight, vvOffsetTop };
    }
    clearTopPosition(mount);
    return { mode: "bottom", topPx: null, vvHeight, vvOffsetTop };
  }

  const rect = mount.getBoundingClientRect();
  const nextTop = Math.round(rect.top + gap);

  if (
    !force &&
    state.mode === "top" &&
    state.topPx != null &&
    Math.abs(nextTop - state.topPx) < POSITION_DELTA_THRESHOLD_PX
  ) {
    return { ...state, vvHeight, vvOffsetTop };
  }

  applyTopPosition(mount, nextTop);
  return { mode: "top", topPx: nextTop, vvHeight, vvOffsetTop };
}

function installChromeDiag() {
  if (typeof window === "undefined") return;

  (
    window as Window & { __gnChromeDiag?: () => Record<string, unknown> }
  ).__gnChromeDiag = () => {
    const mount = document.querySelector('[data-app-mobile-chrome-fixed="bottom"]');
    const navRect = mount?.getBoundingClientRect() ?? null;
    const vvBottom = visualViewportBottomPx() ?? window.innerHeight;
    const gap = navRect ? vvBottom - navRect.bottom : null;
    const payload = {
      navRect: navRect
        ? {
            top: navRect.top,
            bottom: navRect.bottom,
            height: navRect.height,
          }
        : null,
      visualViewportBottom: vvBottom,
      gap,
      vvPositioned: mount?.getAttribute("data-vv-positioned") ?? null,
    };
    console.log("[__gnChromeDiag]", payload);
    return payload;
  };
}

/**
 * Portaled mobile bottom tab bar — outside [data-app-main] so page scroll cannot move it.
 * No top header is mounted here.
 */
export function AppMobileChromePortal() {
  const { authed } = useNavSession();
  const pathname = normalizeAppPathname(usePathname());
  const mountRef = useRef<HTMLDivElement | null>(null);
  const positionStateRef = useRef<NavPositionState>({
    mode: "bottom",
    topPx: null,
    vvHeight: 0,
    vvOffsetTop: 0,
  });
  const [mounted, setMounted] = useState(false);

  const persistedSession =
    typeof window !== "undefined" && hasPersistedSupabaseSession();

  const showNav = shouldRenderMobileBottomNav(pathname, authed, persistedSession);

  useEffect(() => {
    setMounted(true);
    installChromeDiag();
    return () => {
      delete (window as Window & { __gnChromeDiag?: () => unknown }).__gnChromeDiag;
    };
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el || !showNav) return;

    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const sync = (force = false) => {
      positionStateRef.current = applyBottomNavPosition(el, positionStateRef.current, {
        force,
      });
    };

    const scheduleSync = (force = false) => {
      if (debounceId != null) clearTimeout(debounceId);
      debounceId = setTimeout(() => sync(force), RESIZE_DEBOUNCE_MS);
    };

    const onViewportResize = () => scheduleSync(false);
    const onOrientationChange = () => scheduleSync(true);

    sync(true);
    requestAnimationFrame(() => sync(true));

    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportResize);
    window.addEventListener("resize", onViewportResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange);

    return () => {
      if (debounceId != null) clearTimeout(debounceId);
      vv?.removeEventListener("resize", onViewportResize);
      window.removeEventListener("resize", onViewportResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      el.removeAttribute("data-vv-positioned");
      el.style.removeProperty("top");
      el.style.removeProperty("bottom");
      document.documentElement.style.removeProperty(GN_MOBILE_CHROME_BOTTOM_TOP);
      positionStateRef.current = {
        mode: "bottom",
        topPx: null,
        vvHeight: 0,
        vvOffsetTop: 0,
      };
    };
  }, [showNav, mounted]);

  if (!mounted || typeof document === "undefined" || !showNav) {
    return null;
  }

  return createPortal(
    <div
      ref={mountRef}
      data-app-mobile-chrome-fixed="bottom"
      data-app-mobile-bottom-nav-mount
      className="box-border w-full max-w-full min-w-0 overflow-x-clip overflow-y-visible lg:hidden"
    >
      <AppMobileBottomNav />
    </div>,
    document.body,
  );
}
