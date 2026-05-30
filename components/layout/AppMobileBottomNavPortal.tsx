"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS } from "@/lib/layout/appShellClasses";

/**
 * Portals the mobile tab bar to `document.body` so fixed positioning and touch
 * targets are not affected by shell overflow / stacking contexts.
 */
export function AppMobileBottomNavPortal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div data-app-mobile-bottom-nav-mount className={APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS}>
      <AppMobileBottomNav />
    </div>,
    document.body,
  );
}
