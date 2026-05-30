"use client";

import { useLayoutEffect } from "react";
import { resetAppShellHorizontalScroll } from "@/lib/feed/feedScrollContract";

const HORIZONTAL_PAN_ALLOW_SELECTOR = [
  "[data-premium-scout-carousel]",
  "[data-pitchrusch-feed-scroll-root]",
  "input",
  "textarea",
  "select",
  '[contenteditable="true"]',
].join(",");

/**
 * Tab pages (not home feed): zero horizontal scroll + block sideways rubber-band on iOS.
 */
export function AppShellHorizontalScrollLock() {
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (!mq.matches) return;
    if (document.querySelector("[data-pitchrusch-home-feed]")) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const reset = () => {
      resetAppShellHorizontalScroll();
      if (window.scrollX !== 0) {
        window.scrollTo(0, window.scrollY);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest(HORIZONTAL_PAN_ALLOW_SELECTOR)) {
        return;
      }

      const dx = event.touches[0].clientX - touchStartX;
      const dy = event.touches[0].clientY - touchStartY;
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 6) return;

      event.preventDefault();
      reset();
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.scrollLeft !== 0) {
        target.scrollLeft = 0;
      }
      reset();
    };

    reset();
    const raf = requestAnimationFrame(reset);

    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", reset, { passive: true });
    window.addEventListener("orientationchange", reset, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", reset);
      window.removeEventListener("orientationchange", reset);
    };
  }, []);

  return null;
}
