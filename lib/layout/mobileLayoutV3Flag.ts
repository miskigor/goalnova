/**
 * Mobile shell V3: production `/home` always uses the clean home shell (all users).
 * Debug V3 routes remain opt-in via {@link isMobileLayoutV3Enabled}.
 */

export function isMobileLayoutV3Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_MOBILE_LAYOUT_V3?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export function isMobileLayoutV3HomeRoute(pathname: string): boolean {
  return normalizePathname(pathname) === "/home";
}

/** V3 shell on `/home` always; debug routes only when the flag is on. */
export function isMobileLayoutV3ShellRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (path === "/home") {
    return true;
  }
  if (!isMobileLayoutV3Enabled()) {
    return false;
  }
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
