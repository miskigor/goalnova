"use client";

import { useEffect } from "react";
import { scheduleAppMobileHorizontalScrollReset } from "@/lib/layout/appMobileHorizontalScrollReset";

const LANDING_SCROLL_SELECTORS = [
  "[data-landing-root]",
  "[data-landing-hero]",
] as const;

/** `/` and `/[locale]` landing — cold links from IG / Google. */
export function LandingHorizontalScrollRecovery() {
  useEffect(() => {
    const cancel = scheduleAppMobileHorizontalScrollReset([...LANDING_SCROLL_SELECTORS]);
    return cancel;
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      scheduleAppMobileHorizontalScrollReset([...LANDING_SCROLL_SELECTORS]);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
