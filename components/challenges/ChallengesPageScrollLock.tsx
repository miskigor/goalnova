"use client";

import { useLayoutEffect } from "react";

/**
 * Keeps document/body from becoming the scroll container on /challenges (V2).
 * Only [data-mlv2-scroll] may receive vertical pan gestures.
 */
export function ChallengesPageScrollLock() {
  useLayoutEffect(() => {
    const scroll = document.querySelector("[data-mlv2-scroll]");
    if (!(scroll instanceof HTMLElement)) return;

    scroll.scrollTop = 0;
    scroll.scrollLeft = 0;

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Node && scroll.contains(target)) return;
      event.preventDefault();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", onTouchMove);
  }, []);

  return null;
}
