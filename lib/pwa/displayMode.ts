/** Detect installed / standalone display modes across browsers. */

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch {
    /* ignore */
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;

  // Android TWA / related apps sometimes set this referrer.
  if (document.referrer.startsWith("android-app://")) return true;

  return false;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chromeIos = /CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && !chromeIos;
}

export function canUseBeforeInstallPrompt(): boolean {
  return typeof window !== "undefined" && "BeforeInstallPromptEvent" in window;
}
