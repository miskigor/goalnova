"use client";

import { useLayoutEffect, useState } from "react";

/** iOS / coarse-pointer — prefer raster thumbs over inline `<video>` in grids. */
export function exploreTileMobileLikeSnapshot(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iP(hone|ad|od)/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const coarse =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);
  return iOS || coarse;
}

export function useExploreTileMobileLike(): boolean {
  const [isMobileLike, setIsMobileLike] = useState(exploreTileMobileLikeSnapshot);
  useLayoutEffect(() => {
    setIsMobileLike(exploreTileMobileLikeSnapshot());
  }, []);
  return isMobileLike;
}
