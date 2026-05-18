"use client";

import { useEffect } from "react";
import { isDev } from "@/lib/devLog";
import { logScoutApplyPageOverflowOffenders } from "@/lib/layout/detectHorizontalOverflow";

/**
 * Development-only DOM scan for `/scout-apply` horizontal overflow.
 * Stripped in production (`isDev` is false).
 */
export function ScoutApplyOverflowDebug() {
  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    const run = () => {
      logScoutApplyPageOverflowOffenders(window.innerWidth);
    };

    run();
    const t500 = window.setTimeout(run, 500);
    const t1500 = window.setTimeout(run, 1500);
    window.addEventListener("resize", run);
    return () => {
      window.clearTimeout(t500);
      window.clearTimeout(t1500);
      window.removeEventListener("resize", run);
    };
  }, []);

  return null;
}
