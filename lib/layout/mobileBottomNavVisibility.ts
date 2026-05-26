/** Guest auth screens — no bottom tab bar. */
export const MOBILE_BOTTOM_NAV_HIDE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/confirm-email",
  "/reset-password",
  "/auth/",
] as const;

/** Logged-in app routes — bottom nav must stay mounted (incl. overflow menu targets). */
export const MOBILE_BOTTOM_NAV_APP_PREFIXES = [
  "/home",
  "/profile",
  "/upload",
  "/benefits",
  "/premium",
  "/explore",
  "/challenges",
  "/messages",
  "/settings",
  "/notifications",
  "/discover",
  "/search",
  "/rankings",
  "/scout-dashboard",
  "/scout-apply",
  "/player",
] as const;

export function shouldHideMobileBottomNav(pathname: string): boolean {
  if (pathname === "/role" || pathname.startsWith("/role/")) return true;
  return MOBILE_BOTTOM_NAV_HIDE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

export function isMobileBottomNavAppRoute(pathname: string): boolean {
  return MOBILE_BOTTOM_NAV_APP_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function shouldRenderMobileBottomNav(
  pathname: string,
  authed: boolean | null,
  hasPersistedSession: boolean,
): boolean {
  if (shouldHideMobileBottomNav(pathname)) return false;
  if (isMobileBottomNavAppRoute(pathname)) return true;
  if (authed === false && !hasPersistedSession) return false;
  return true;
}
