"use client";

import { useEffect } from "react";

/** Locks vertical document scroll on the landing route (all viewports — no rubber-band / page scroll). */
export function LandingScrollLock() {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return null;
}
