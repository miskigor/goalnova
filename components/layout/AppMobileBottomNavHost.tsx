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

function hasPersistedSupabaseSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return false;
    const ref = new URL(url).hostname.split(".")[0];
    const raw = window.localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return (
      typeof parsed?.access_token === "string" && parsed.access_token.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Keeps mobile bottom nav mounted across (app) / (public) layout switches.
 * Rendered from `[locale]/layout` outside route `Suspense` so navigations do not tear it down.
 */
export function AppMobileBottomNavHost() {
  const { authed } = useNavSession();
  const pathname = usePathname();

  if (shouldHideBottomNav(pathname)) {
    return null;
  }

  const persistedSession =
    typeof window !== "undefined" && hasPersistedSupabaseSession();

  // Stay visible while auth resolves; ignore transient authed=false during token refresh.
  if (authed === false && !persistedSession) {
    return null;
  }

  return <AppMobileChromePortal />;
}
