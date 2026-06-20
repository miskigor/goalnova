"use client";

import { useEffect } from "react";

/** Removes the static boot splash once React has mounted (handoff to app loading UI). */
export function BootSplashDismiss() {
  useEffect(() => {
    const el = document.getElementById("pitchrusch-boot-splash");
    if (!el) return;

    const dismiss = () => {
      el.style.transition = "opacity 220ms ease";
      el.style.opacity = "0";
      window.setTimeout(() => el.remove(), 240);
    };

    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(dismiss);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return null;
}
