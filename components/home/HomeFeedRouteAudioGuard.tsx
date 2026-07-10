"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  isHomeFeedPathname,
  pauseHomeFeedMedia,
} from "@/lib/video/pauseHomeFeedMedia";

/**
 * Pauses home-feed clips as soon as the user navigates away from `/home`.
 * Mounted in app chrome so it runs even if feed teardown lags behind route changes.
 */
export function HomeFeedRouteAudioGuard() {
  const pathname = usePathname() ?? "";

  useLayoutEffect(() => {
    if (isHomeFeedPathname(pathname)) return;
    pauseHomeFeedMedia();
  }, [pathname]);

  useEffect(() => {
    const onPageHide = () => pauseHomeFeedMedia();
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return null;
}
