/** Mobile non-home app shell visual viewport sync (iOS Safari offsetLeft). Home feed uses {@link homeFeedVisualViewportSync} instead. */

export const GN_APP_SHELL_VV_LEFT_VAR = "--gn-app-shell-vv-left";
export const GN_APP_SHELL_VV_WIDTH_VAR = "--gn-app-shell-vv-width";

const APP_SHELL_MOBILE_MAX_WIDTH_PX = 1023;

function isAppShellMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${APP_SHELL_MOBILE_MAX_WIDTH_PX}px)`).matches;
}

function isHomePathname(): boolean {
  if (typeof window === "undefined") return false;
  const normalized = window.location.pathname.replace(/\/$/, "") || "/";
  return normalized.endsWith("/home");
}

/** Active only on mobile app chrome without home feed mounted. */
export function shouldActivateAppShellVisualViewportSync(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (!isAppShellMobileViewport()) return false;
  if (!document.querySelector("[data-app-root]")) return false;
  if (document.querySelector("[data-pitchrusch-home-feed]")) return false;
  if (isHomePathname()) return false;
  return true;
}

function appShellVisualViewportMetrics(): { left: string; width: string } {
  const vv = window.visualViewport;
  const offsetLeft = Math.max(0, vv?.offsetLeft ?? 0);
  const widthPx = vv?.width ?? window.innerWidth;
  return {
    left: `${offsetLeft}px`,
    width: `${widthPx}px`,
  };
}

export function syncAppShellVisualViewportVars(): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (!shouldActivateAppShellVisualViewportSync()) {
    clearAppShellVisualViewportVars();
    return;
  }

  const { left, width } = appShellVisualViewportMetrics();
  root.style.setProperty(GN_APP_SHELL_VV_LEFT_VAR, left);
  root.style.setProperty(GN_APP_SHELL_VV_WIDTH_VAR, width);

  console.warn("[app-shell-vv-sync] apply", {
    left,
    width,
    pathname: window.location.pathname,
    hasAppRoot: Boolean(document.querySelector("[data-app-root]")),
    hasHomeFeed: Boolean(document.querySelector("[data-pitchrusch-home-feed]")),
  });
}

export function clearAppShellVisualViewportVars(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty(GN_APP_SHELL_VV_LEFT_VAR);
  root.style.removeProperty(GN_APP_SHELL_VV_WIDTH_VAR);
}

/** Bind listeners; call returned cleanup on unmount. */
export function bindAppShellVisualViewportSync(): () => void {
  if (typeof window === "undefined") return () => {};

  console.warn("[app-shell-vv-sync] mounted", {
    href: window.location.href,
    pathname: window.location.pathname,
  });

  const run = () => syncAppShellVisualViewportVars();

  run();
  const rafId = requestAnimationFrame(run);
  const t50 = window.setTimeout(run, 50);
  const t250 = window.setTimeout(run, 250);

  const vv = window.visualViewport;
  vv?.addEventListener("resize", run);
  vv?.addEventListener("scroll", run);
  window.addEventListener("resize", run);
  window.addEventListener("orientationchange", run);

  return () => {
    cancelAnimationFrame(rafId);
    window.clearTimeout(t50);
    window.clearTimeout(t250);
    vv?.removeEventListener("resize", run);
    vv?.removeEventListener("scroll", run);
    window.removeEventListener("resize", run);
    window.removeEventListener("orientationchange", run);
    clearAppShellVisualViewportVars();
  };
}
