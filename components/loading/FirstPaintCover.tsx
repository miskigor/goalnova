"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Black overlay in the first SSR body bytes. Unmounts after hydrate so AuthGate
 * / the page show through. Root layout does not remount on client navigations.
 */
export function FirstPaintCover() {
  const [show, setShow] = useState(true);

  useLayoutEffect(() => {
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div
      id="pitchrusch-first-paint"
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        margin: 0,
        backgroundColor: "#000",
        pointerEvents: "none",
      }}
    />
  );
}
