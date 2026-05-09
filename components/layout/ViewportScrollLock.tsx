"use client";

import { useEffect } from "react";

/** Locks `html`/`body` vertical scroll (full-viewport auth/landing pages). */
export function ViewportScrollLock() {
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return null;
}
