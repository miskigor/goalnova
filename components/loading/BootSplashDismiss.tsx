"use client";

import { useEffect } from "react";

/** Removes the static boot splash once React has hydrated (splash is not a React node). */
export function BootSplashDismiss() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = document.getElementById("pitchrusch-boot-splash");
      if (!el) return;
      el.style.transition = "opacity 220ms ease";
      el.style.opacity = "0";
      window.setTimeout(() => {
        try {
          el.remove();
        } catch {
          /* already removed */
        }
      }, 240);
    }, 50);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
