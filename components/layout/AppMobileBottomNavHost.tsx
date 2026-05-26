"use client";

import { usePathname } from "@/i18n/navigation";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import { normalizeAppPathname } from "@/lib/layout/normalizeAppPathname";
import { shouldRenderMobileBottomNav } from "@/lib/layout/mobileBottomNavVisibility";
import { AppMobileChromePortal } from "@/components/layout/AppMobileChromePortal";
import { useNavSession } from "@/components/layout/useNavSession";

/**
 * Keeps mobile bottom nav mounted across (app) / (public) layout switches.
 * Rendered from `[locale]/layout` outside route `Suspense` so navigations do not tear it down.
 */
export function AppMobileBottomNavHost() {
  const { authed } = useNavSession();
  const pathname = normalizeAppPathname(usePathname());

  const persistedSession =
    typeof window !== "undefined" && hasPersistedSupabaseSession();

  if (!shouldRenderMobileBottomNav(pathname, authed, persistedSession)) {
    return null;
  }

  return <AppMobileChromePortal />;
}
