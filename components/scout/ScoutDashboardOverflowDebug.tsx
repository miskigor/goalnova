"use client";

import { useEffect } from "react";
import { isDev } from "@/lib/devLog";
import { logScoutDashboardPageOverflowOffenders } from "@/lib/layout/detectHorizontalOverflow";

/**
 * Development-only DOM scan for `/scout-dashboard` horizontal overflow.
 */
export function ScoutDashboardOverflowDebug() {
  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    const run = () => {
      logScoutDashboardPageOverflowOffenders(window.innerWidth);
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
