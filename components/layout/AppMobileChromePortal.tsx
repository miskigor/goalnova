"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppMobileChromeMetrics } from "@/components/layout/AppMobileChromeMetrics";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";

/**
 * Renders mobile header + tab bar on `document.body` so `position: fixed` anchors to the
 * viewport (not `display:contents`, nested fixed shells, or `body { position: fixed }` on tab pages).
 */
export function AppMobileChromePortal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <AppMobileChromeMetrics />
      <div
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="top"
        className="pointer-events-auto fixed start-0 end-0 top-0 z-[1000] box-border w-full max-w-full min-w-0 overflow-x-clip max-lg:block lg:hidden"
        style={{ transform: "translateZ(0)" }}
      >
        <AppMobileHeader />
      </div>
      <div
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="bottom"
        className="pointer-events-auto fixed start-0 end-0 bottom-0 z-[1000] box-border w-full max-w-full min-w-0 overflow-x-clip max-lg:block lg:hidden"
        style={{ transform: "translateZ(0)" }}
      >
        <AppMobileBottomNav />
      </div>
    </>,
    document.body,
  );
}
