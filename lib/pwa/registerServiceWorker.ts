/** Register `/sw.js` and auto-activate updates. */

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerPitchRuschServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!("serviceWorker" in navigator)) return Promise.resolve(null);

  // Avoid SW cache fighting Next.js HMR in development unless explicitly enabled.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_PWA_SW !== "1"
  ) {
    return Promise.resolve(null);
  }

  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // Periodic update checks while the app is open.
      window.setInterval(() => {
        void reg.update();
      }, 60 * 60 * 1000);

      return reg;
    } catch (err) {
      console.warn("[PitchRusch PWA] service worker registration failed", err);
      return null;
    }
  })();

  return registrationPromise;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? null;
  } catch {
    return null;
  }
}
