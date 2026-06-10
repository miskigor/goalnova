"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNavSlotV3 } from "@/components/layout/mobile-v3/MobileBottomNavSlotV3";
import { MLV3_HTML_ATTR } from "@/components/layout/mobile-v3/mobileLayoutV3.tokens";
import {
  isMobileLayoutV3HomeFeedRoute,
  isMobileLayoutV3HomeMockRoute,
  isMobileLayoutV3HomeRoute,
} from "@/lib/layout/mobileLayoutV3Flag";
import "@/components/layout/mobile-v3/mobileLayoutV3.css";

/**
 * Mobile shell V3: one scroll container (or home-mock feed scroll), bottom nav outside scroll.
 * Only mounted on V3 debug routes when the flag is on.
 */
export function AppChromeLayoutV3({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHomeMock = isMobileLayoutV3HomeMockRoute(pathname);
  const isHomeFeed = isMobileLayoutV3HomeFeedRoute(pathname);
  const isHomeProduction = isMobileLayoutV3HomeRoute(pathname);
  const isHomeV3ShellHome = isHomeMock || isHomeFeed || isHomeProduction;
  const routeAttr = isHomeMock
    ? "home-mock"
    : isHomeFeed
      ? "home-feed"
      : isHomeProduction
        ? "home"
        : "debug";

  useLayoutEffect(() => {
    document.documentElement.setAttribute(MLV3_HTML_ATTR, "");
    return () => {
      document.documentElement.removeAttribute(MLV3_HTML_ATTR);
    };
  }, []);

  return (
    <div
      data-mlv3-root="true"
      suppressHydrationWarning
      className={`bg-gn-bg text-gn-text lg:flex lg:min-h-dvh lg:flex-row${isHomeV3ShellHome ? " max-lg:overflow-x-hidden max-lg:max-w-full" : ""}`}
    >
      <AppSidebar />
      <div data-mlv3-column>
        <div
          data-mlv3-main
          data-mlv3-route={routeAttr}
        >
          <div data-mlv3-scroll>{children}</div>
        </div>
        <MobileBottomNavSlotV3>
          <AppMobileBottomNav />
        </MobileBottomNavSlotV3>
      </div>
    </div>
  );
}
