"use client";

import type { ReactNode } from "react";
import { MobileBottomTabs } from "@/components/layout/MobileBottomTabs";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { MOBILE_APP_SHELL_V2_CLASS } from "@/lib/layout/appShellClasses";

/**
 * V2 logged-in mobile shell: top bar + scrollable slot + bottom tabs (no portal).
 * Desktop (`lg+`) hides top/bottom; slot flows beside {@link AppSidebar}.
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  return (
    <div data-mobile-app-shell className={MOBILE_APP_SHELL_V2_CLASS}>
      <MobileTopBar />
      {children}
      <MobileBottomTabs />
    </div>
  );
}
