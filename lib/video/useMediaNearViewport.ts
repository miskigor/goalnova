"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Extra pixels around viewport before starting download (CSS margin syntax). */
  rootMargin?: string;
  /** Once visible, keep `true` so we do not tear down decoded buffers when scrolling away. */
  sticky?: boolean;
};

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

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setLoadMedia(true);
            if (sticky) io.disconnect();
          }
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loadMedia, rootMargin, sticky]);

  return { containerRef, loadMedia };
}
