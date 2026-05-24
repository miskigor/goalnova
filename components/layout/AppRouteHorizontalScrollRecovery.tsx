"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { clearHomeFeedVisualViewportVars } from "@/components/home/homeFeedVisualViewportSync";
import { resetHomeFeedHorizontalScroll } from "@/lib/feed/feedScrollContract";
import {
  isAppAdminPath,
  isAppHomePath,
  isAppProfilePath,
  scheduleAppMobileHorizontalScrollReset,
} from "@/lib/layout/appMobileHorizontalScrollReset";

function extraSelectorsForPath(pathname: string): string[] {
  const extra: string[] = [];
  if (isAppProfilePath(pathname)) extra.push("[data-profile-shell]");
  if (isAppAdminPath(pathname)) extra.push("[data-admin-shell]");
  return extra;
}

function runRouteRecovery(pathname: string): () => void {
  if (isAppHomePath(pathname)) {
    resetHomeFeedHorizontalScroll();
    return scheduleAppMobileHorizontalScrollReset([
      "[data-pitchrusch-home-feed]",
      "[data-pitchrusch-feed-scroll-root]",
    ]);
  }

  clearHomeFeedVisualViewportVars();
  return scheduleAppMobileHorizontalScrollReset(extraSelectorsForPath(pathname));
}

/**
 * All authenticated app routes: reset stale horizontal scroll / home VV vars on
 * entry, navigation, and bfcache restore (IG / mobile Safari).
 */
export function AppRouteHorizontalScrollRecovery() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    return runRouteRecovery(pathname);
  }, [pathname]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      runRouteRecovery(pathname);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [pathname]);

  return null;
}
