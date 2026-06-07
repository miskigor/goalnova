"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNavSlotV3 } from "@/components/layout/mobile-v3/MobileBottomNavSlotV3";
import { MLV3_HTML_ATTR } from "@/components/layout/mobile-v3/mobileLayoutV3.tokens";
import "@/components/layout/mobile-v3/mobileLayoutV3.css";

/**
 * Mobile shell V3 (Phase 1): one scroll container, bottom nav outside scroll.
 * Only mounted on `/debug/mobile-layout-v3` when V3 flag is on.
 */
export function AppChromeLayoutV3({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute(MLV3_HTML_ATTR, "");
    return () => {
      document.documentElement.removeAttribute(MLV3_HTML_ATTR);
    };
  }, []);

  return (
    <div
      data-mlv3-root
      className="bg-gn-bg text-gn-text lg:flex lg:min-h-dvh lg:flex-row"
    >
      <AppSidebar />
      <div data-mlv3-column>
        <div data-mlv3-main>
          <div data-mlv3-scroll>{children}</div>
        </div>
        <MobileBottomNavSlotV3>
          <AppMobileBottomNav />
        </MobileBottomNavSlotV3>
      </div>
    </div>
  );
}
