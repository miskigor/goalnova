"use client";

import { useEffect, type RefObject } from "react";

/**
 * iOS Safari often keeps the first frame of a muted inline `<video>` black until
 * `currentTime` is moved slightly (profile grid tiles use the same approach).
 */
export function useIosInlineVideoFirstFrameBump(
  mediaRef: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  src: string | undefined | null,
) {
  useEffect(() => {
    if (!enabled || !src) return;
    const el = mediaRef.current;
    if (!el) return;
    const bump = () => {
      try {
        if (el.readyState >= 1 && Number.isFinite(el.duration) && el.duration > 0) {
          el.currentTime = Math.min(0.04, el.duration * 0.001);
        }
      } catch {
        /* ignore */
      }
    };
    el.addEventListener("loadeddata", bump);
    el.addEventListener("loadedmetadata", bump);
    return () => {
      el.removeEventListener("loadeddata", bump);
      el.removeEventListener("loadedmetadata", bump);
    };
  }, [enabled, src, mediaRef]);
}
