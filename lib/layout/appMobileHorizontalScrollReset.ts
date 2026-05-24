/** Mobile WebView / iOS: reset horizontal scroll after SPA nav or bfcache restore. */

export const APP_MOBILE_SCROLL_RESET_MAX_WIDTH_PX = 1023;

export const APP_SHELL_HORIZONTAL_SCROLL_SELECTORS = [
  "[data-app-root]",
  "[data-app-column]",
  "[data-app-main]",
  "[data-app-main-inner]",
] as const;

export function isMobileHorizontalScrollResetViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(
    `(max-width: ${APP_MOBILE_SCROLL_RESET_MAX_WIDTH_PX}px)`,
  ).matches;
}

export function resetHorizontalScrollForSelectors(
  selectors: readonly string[],
): void {
  if (typeof document === "undefined") return;

  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => {
      if (node instanceof HTMLElement) node.scrollLeft = 0;
    });
  }
}

/** Window + shell scrollports; optional extra selectors per route (profile, admin, landing). */
export function resetAppMobileHorizontalScroll(
  extraSelectors: readonly string[] = [],
): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (!isMobileHorizontalScrollResetViewport()) return;

  window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;

  resetHorizontalScrollForSelectors([
    ...APP_SHELL_HORIZONTAL_SCROLL_SELECTORS,
    ...extraSelectors,
  ]);
}

export function scheduleAppMobileHorizontalScrollReset(
  extraSelectors: readonly string[] = [],
): () => void {
  const run = () => resetAppMobileHorizontalScroll(extraSelectors);
  run();
  const t0 = window.setTimeout(run, 0);
  const t50 = window.setTimeout(run, 50);
  const t250 = window.setTimeout(run, 250);
  return () => {
    window.clearTimeout(t0);
    window.clearTimeout(t50);
    window.clearTimeout(t250);
  };
}

export function isAppHomePath(pathname: string): boolean {
  return pathname === "/home" || pathname.endsWith("/home");
}

export function isAppProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.endsWith("/profile");
}

export function isAppAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
