"use client";

import { usePathname } from "@/i18n/navigation";
import { AppMobileChromePortal } from "@/components/layout/AppMobileChromePortal";
import { useNavSession } from "@/components/layout/useNavSession";

/** Guest auth screens — no bottom tab bar. */
const HIDE_BOTTOM_NAV_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/confirm-email",
  "/reset-password",
  "/auth/",
] as const;

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname === "/role" || pathname.startsWith("/role/")) return true;
  return HIDE_BOTTOM_NAV_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

/**
 * Keeps mobile bottom nav mounted across (app) / (public) layout switches.
 * Rendered from `[locale]/layout` so client navigations do not tear down the portal.
 */
export function AppMobileBottomNavHost() {
  const { authed } = useNavSession();
  const pathname = usePathname();

  if (authed === false || shouldHideBottomNav(pathname)) {
    return null;
  }

  return <AppMobileChromePortal />;
}
