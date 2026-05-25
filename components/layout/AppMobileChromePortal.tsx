"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";

const GN_MOBILE_VISUAL_BOTTOM_INSET_VAR = "--gn-mobile-visual-bottom-inset";

/** Lift bottom chrome above iOS / in-app browser UI below the visual viewport. */
function syncMobileVisualBottomInset(): void {
  if (typeof window === "undefined") return;

  const vv = window.visualViewport;
  if (!vv) {
    document.documentElement.style.setProperty(
      GN_MOBILE_VISUAL_BOTTOM_INSET_VAR,
      "0px",
    );
    return;
  }

  const bottomInset = Math.max(
    0,
    window.innerHeight - (vv.offsetTop + vv.height),
  );
  document.documentElement.style.setProperty(
    GN_MOBILE_VISUAL_BOTTOM_INSET_VAR,
    `${bottomInset}px`,
  );
}

function clearMobileVisualBottomInset(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty(GN_MOBILE_VISUAL_BOTTOM_INSET_VAR);
}

/**
 * Renders mobile header + tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    syncMobileVisualBottomInset();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", syncMobileVisualBottomInset);
    vv?.addEventListener("scroll", syncMobileVisualBottomInset);
    window.addEventListener("resize", syncMobileVisualBottomInset, {
      passive: true,
    });

    return () => {
      vv?.removeEventListener("resize", syncMobileVisualBottomInset);
      vv?.removeEventListener("scroll", syncMobileVisualBottomInset);
      window.removeEventListener("resize", syncMobileVisualBottomInset);
      clearMobileVisualBottomInset();
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
