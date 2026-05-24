"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { clearHomeFeedVisualViewportVars } from "@/components/home/homeFeedVisualViewportSync";
import { scheduleAppMobileHorizontalScrollReset } from "@/lib/layout/appMobileHorizontalScrollReset";

const PUBLIC_SCROLL_SELECTORS = ["[data-public-shell]", "[data-public-video-detail]"] as const;

function runPublicRecovery(): () => void {
  clearHomeFeedVisualViewportVars();
  return scheduleAppMobileHorizontalScrollReset([...PUBLIC_SCROLL_SELECTORS]);
}

/** Guest public routes (`/explore`, shared video links, …); authed guests use app chrome inside PublicShell. */
export function PublicRouteHorizontalScrollRecovery() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    return runPublicRecovery();
  }, [pathname]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      runPublicRecovery();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [pathname]);

  return null;
}
