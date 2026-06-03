"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Extra pixels around viewport before starting download (CSS margin syntax). */
  rootMargin?: string;
  /** Once visible, keep `true` so we do not tear down decoded buffers when scrolling away. */
  sticky?: boolean;
};

/** App scrollport (V2 shell or V1 main) — IO must use this, not the layout viewport. */
function resolveIntersectionRoot(el: HTMLElement): Element | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    if (
      node.hasAttribute("data-mlv2-scroll") ||
      node.hasAttribute("data-app-main") ||
      node.hasAttribute("data-pitchrusch-feed-scroll-root")
    ) {
      return node;
    }
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function intersectsRoot(el: HTMLElement, root: Element | null): boolean {
  const elRect = el.getBoundingClientRect();
  if (!root) {
    return elRect.bottom > 0 && elRect.top < window.innerHeight;
  }
  const rootRect = root.getBoundingClientRect();
  return elRect.bottom > rootRect.top && elRect.top < rootRect.bottom;
}

/**
 * Defers heavy `<video src>` work until the tile is near the viewport — cuts parallel
 * downloads when many clips are on screen (Explore, profile grid, rankings, challenges).
 */
export function useMediaNearViewport(options: Options = {}) {
  const { rootMargin = "300px 0px 300px 0px", sticky = true } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadMedia, setLoadMedia] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || (sticky && loadMedia)) return;

    const scrollRoot = resolveIntersectionRoot(el);
    if (intersectsRoot(el, scrollRoot)) {
      setLoadMedia(true);
      if (sticky) return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setLoadMedia(true);
            if (sticky) io.disconnect();
          }
        }
      },
      { root: scrollRoot, rootMargin, threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loadMedia, rootMargin, sticky]);

  return { containerRef, loadMedia };
}
