"use client";

import { useEffect } from "react";

/**
 * One-shot cleanup for phones that still have a service worker from the
 * briefly deployed (then reverted) PWA install experiment.
 */
export function UnregisterStaleServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (cancelled || regs.length === 0) return;

        await Promise.all(regs.map((reg) => reg.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        /* ignore — cleanup is best-effort */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
