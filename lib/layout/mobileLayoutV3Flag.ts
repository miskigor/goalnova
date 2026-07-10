/**
 * Mobile shell V3 — debug routes only (opt-in via {@link isMobileLayoutV3Enabled}).
 * Production `/home` uses the same V2 shell as all other app routes for stable chrome.
 */

export function isMobileLayoutV3Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_MOBILE_LAYOUT_V3?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function isMobileLayoutV3HomeRoute(pathname: string): boolean {
  return normalizePathname(pathname) === "/home";
}

/** V3 shell only on debug routes when the flag is on (never production `/home`). */
export function isMobileLayoutV3ShellRoute(pathname: string): boolean {
  if (!isMobileLayoutV3Enabled()) {
    return false;
  }
  const path = normalizePathname(pathname);
  return (
    path === "/debug/mobile-layout-v3" ||
    path === "/debug/mobile-layout-v3/home-mock" ||
    path === "/debug/mobile-layout-v3/home-feed"
  );
}

export function isMobileLayoutV3HomeMockRoute(pathname: string): boolean {
  return normalizePathname(pathname) === "/debug/mobile-layout-v3/home-mock";
}

export function isMobileLayoutV3HomeFeedRoute(pathname: string): boolean {
  return normalizePathname(pathname) === "/debug/mobile-layout-v3/home-feed";
}

function normalizePathname(pathname: string): string {
  return (pathname.split("?")[0] ?? "/").replace(/\/+$/, "") || "/";
}
