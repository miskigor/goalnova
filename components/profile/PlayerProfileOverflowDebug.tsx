"use client";

import { useEffect } from "react";
import { isDev } from "@/lib/devLog";
import { logProfilePageOverflowOffenders } from "@/lib/layout/detectHorizontalOverflow";

/**
 * Development-only probe for `/player/[slug]` horizontal overflow.
 * Renders nothing visible; stripped from production via `isDev`.
 */
export function PlayerProfileOverflowDebug() {
  useEffect(() => {
    if (!isDev || typeof window === "undefined") return;

    const run = () => {
      const root = document.querySelector("[data-player-public-profile]");
      if (root instanceof HTMLElement) {
        logProfilePageOverflowOffenders(root, window.innerWidth);
      }
    };

    run();
    const t0 = window.setTimeout(run, 0);
    const t1 = window.setTimeout(run, 400);
    const t2 = window.setTimeout(run, 1200);
    window.addEventListener("resize", run);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", run);
    };
  }, []);

  return null;
}
