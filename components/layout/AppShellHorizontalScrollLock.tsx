"use client";

import { useLayoutEffect } from "react";
import { resetAppShellHorizontalScroll } from "@/lib/feed/feedScrollContract";

/**
 * Tab pages (not home feed): keep shell scrollports at scrollLeft 0 — iOS Safari
 * often drifts horizontally after keyboard / viewport chrome changes.
 */
export function AppShellHorizontalScrollLock() {
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (!mq.matches) return;
    if (document.querySelector("[data-pitchrusch-home-feed]")) return;

    const reset = () => resetAppShellHorizontalScroll();

    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.scrollLeft !== 0) {
        target.scrollLeft = 0;
      }
      reset();
    };

    reset();
    const raf = requestAnimationFrame(reset);

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", reset, { passive: true });
    const vv = window.visualViewport;
    vv?.addEventListener("scroll", reset);
    vv?.addEventListener("resize", reset);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", reset);
      vv?.removeEventListener("scroll", reset);
      vv?.removeEventListener("resize", reset);
    };
  }, []);

  return null;
}
