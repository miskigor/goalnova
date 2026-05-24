"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
      <div
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="top"
        className="pointer-events-auto fixed inset-x-0 top-0 z-[610] box-border w-full max-w-full min-w-0 translate-z-0 overflow-x-clip max-lg:block lg:hidden"
      >
        <AppMobileHeader />
      </div>
      <div
        data-app-mobile-chrome
        data-app-mobile-chrome-fixed="bottom"
        className="pointer-events-auto fixed inset-x-0 bottom-0 z-[610] box-border w-full max-w-full min-w-0 translate-z-0 overflow-x-clip max-lg:block lg:hidden"
      >
        <AppMobileBottomNav />
      </div>
    </>,
    document.body,
  );
}
