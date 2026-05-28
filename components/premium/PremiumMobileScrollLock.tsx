"use client";

import { useLayoutEffect } from "react";

/**
 * Premium /mobile: block document rubber-band; scout carousel may still pan-x.
 */
export function PremiumMobileScrollLock() {
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (!mq.matches) return;

    window.scrollTo(0, 0);
    const main = document.querySelector("[data-app-main]");
    if (main instanceof HTMLElement) {
      main.scrollTop = 0;
    }

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest("[data-premium-scout-carousel]") ||
        target.closest("[data-app-mobile-bottom-nav-mount]")
      ) {
        return;
      }
      event.preventDefault();
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
