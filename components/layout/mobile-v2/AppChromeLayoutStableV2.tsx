"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ScoutVerificationBanner } from "@/components/layout/ScoutVerificationBanner";
import { MobileLayoutStableV2RouteFrame } from "@/components/layout/mobile-v2/MobileLayoutStableV2RouteFrame";
import {
  MLV2_BOTTOM_NAV_ATTR,
  MLV2_ROOT_ATTR,
  MLV2_SCROLL_ATTR,
} from "@/components/layout/mobile-v2/mobileLayoutStableV2.tokens";

/**
 * Mobile shell V2 (feature-flagged): one scrollport, in-flow bottom nav, no top app menu.
 * Desktop keeps {@link AppSidebar}; mobile uses bottom nav only.
 */
export function AppChromeLayoutStableV2({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute(MLV2_ROOT_ATTR, "");
    return () => {
      document.documentElement.removeAttribute(MLV2_ROOT_ATTR);
    };
  }, []);

  return (
    <>
      <AppLayoutDebugProbe />
      <AppShellDebugOverlay />
      <div data-mlv2-root className="bg-gn-bg text-gn-text lg:flex lg:min-h-dvh lg:flex-row">
        <AppSidebar />
        <div data-mlv2-column>
          <div data-mlv2-scroll>
            <MobileLayoutStableV2RouteFrame>
              <ScoutVerificationBanner />
              {children}
            </MobileLayoutStableV2RouteFrame>
          </div>
          <div data-mlv2-bottom-nav className="max-lg:block lg:hidden">
            <AppMobileBottomNav />
          </div>
        </div>
      </div>
    </>
  );
}
