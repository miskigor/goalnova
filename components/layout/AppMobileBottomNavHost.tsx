"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import { isLikelyInAppBrowser } from "@/lib/auth/inAppBrowser";
import { normalizeAppPathname } from "@/lib/layout/normalizeAppPathname";
import { shouldRenderMobileBottomNav } from "@/lib/layout/mobileBottomNavVisibility";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { useNavSession } from "@/components/layout/useNavSession";
import { APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS } from "@/lib/layout/appShellClasses";

/**
 * In-layout mobile bottom tab bar (fixed to viewport). Rendered from {@link AppChromeLayout}.
 */
export function AppMobileBottomNavHost() {
  const { authed } = useNavSession();
  const pathname = normalizeAppPathname(usePathname());
  const [hideForInAppBrowser, setHideForInAppBrowser] = useState(false);

  useLayoutEffect(() => {
    setHideForInAppBrowser(isLikelyInAppBrowser());
  }, []);

  const persistedSession =
    typeof window !== "undefined" && hasPersistedSupabaseSession();

  if (!shouldRenderMobileBottomNav(pathname, authed, persistedSession)) {
    return null;
  }

  if (hideForInAppBrowser) {
    return null;
  }

  return (
    <div data-app-mobile-bottom-nav-mount className={APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS}>
      <AppMobileBottomNav />
    </div>
  );
}
