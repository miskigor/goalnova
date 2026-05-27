import { normalizeAppPathname } from "@/lib/layout/normalizeAppPathname";

/** Guest auth screens — no bottom tab bar. */
export const MOBILE_BOTTOM_NAV_HIDE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/confirm-email",
  "/reset-password",
  "/auth/",
] as const;

/** Player / logged-in app routes — bottom nav stays mounted. */
export const MOBILE_BOTTOM_NAV_APP_PREFIXES = [
  "/home",
  "/explore",
  "/challenges",
  "/upload",
  "/profile",
  "/premium",
  "/benefits",
  "/notifications",
  "/messages",
  "/settings",
  "/discover",
  "/search",
  "/support",
  "/rankings",
  "/scout-dashboard",
  "/scout-apply",
  "/player",
] as const;

export function shouldHideMobileBottomNav(pathname: string): boolean {
  const path = normalizeAppPathname(pathname);
  if (path === "/role" || path.startsWith("/role/")) return true;
  return MOBILE_BOTTOM_NAV_HIDE_PREFIXES.some(
    (p) => path === p || path.startsWith(p),
  );
}

export function isMobileBottomNavAppRoute(pathname: string): boolean {
  const path = normalizeAppPathname(pathname);
  return MOBILE_BOTTOM_NAV_APP_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

export function shouldRenderMobileBottomNav(
  pathname: string,
  authed: boolean | null,
  hasPersistedSession: boolean,
): boolean {
  const path = normalizeAppPathname(pathname);
  if (shouldHideMobileBottomNav(path)) return false;
  if (isMobileBottomNavAppRoute(path)) return true;
  if (authed === false && !hasPersistedSession) return false;
  return true;
}
