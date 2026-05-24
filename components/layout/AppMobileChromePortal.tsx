"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";

const GN_VISUAL_VIEWPORT_BOTTOM_INSET_VAR = "--gn-visual-viewport-bottom-inset";

function syncVisualViewportBottomInset(): void {
  if (typeof window === "undefined") return;
  const vv = window.visualViewport;
  const inset = Math.max(
    0,
    Math.round(window.innerHeight - (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0)),
  );
  document.documentElement.style.setProperty(
    GN_VISUAL_VIEWPORT_BOTTOM_INSET_VAR,
    `${inset}px`,
  );
}

function clearVisualViewportBottomInset(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty(GN_VISUAL_VIEWPORT_BOTTOM_INSET_VAR);
}

/**
 * Renders mobile header + tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const applyIfMobile = () => {
      if (mq.matches) {
        syncVisualViewportBottomInset();
      } else {
        clearVisualViewportBottomInset();
      }
    };

    applyIfMobile();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", applyIfMobile);
    vv?.addEventListener("scroll", applyIfMobile);
    window.addEventListener("resize", applyIfMobile);
    window.addEventListener("orientationchange", applyIfMobile);
    mq.addEventListener("change", applyIfMobile);

    return () => {
      vv?.removeEventListener("resize", applyIfMobile);
      vv?.removeEventListener("scroll", applyIfMobile);
      window.removeEventListener("resize", applyIfMobile);
      window.removeEventListener("orientationchange", applyIfMobile);
      mq.removeEventListener("change", applyIfMobile);
      clearVisualViewportBottomInset();
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
        className="pointer-events-auto fixed inset-x-0 top-0 z-[610] box-border w-full min-w-0 max-w-full translate-z-0 overflow-x-clip max-lg:block lg:hidden"
      >
        <AppMobileHeader />
      </div>
      <div
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="bottom"
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[610] box-border w-full min-w-0 max-w-full translate-z-0 overflow-x-clip max-lg:block lg:hidden"
      >
        <AppMobileBottomNav />
      </div>
    </>,
    document.body,
  );
}
