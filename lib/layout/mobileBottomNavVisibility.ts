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

/**
 * Logged-in routes (main tabs + profile overflow menu).
 * Keep in sync with {@link NavUserMenu} bottom-nav overflow links.
 */
export const MOBILE_BOTTOM_NAV_APP_PREFIXES = [
  "/home",
  "/profile",
  "/upload",
  "/benefits",
  "/premium",
  "/explore",
  "/challenges",
  "/messages",
  "/notifications",
  "/settings",
  "/support",
  "/discover",
  "/search",
  "/rankings",
  "/scout-dashboard",
  "/scout-apply",
  "/player",
  "/admin",
  "/payment",
  "/debug",
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
  if (shouldHideMobileBottomNav(pathname)) return false;
  if (isMobileBottomNavAppRoute(pathname)) return true;
  if (authed === false && !hasPersistedSession) return false;
  return true;
}
