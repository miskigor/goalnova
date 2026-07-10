"use client";

import { Suspense } from "react";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { ScoutVerificationBanner } from "@/components/layout/ScoutVerificationBanner";
import { AppPrimaryTopNavStrip } from "@/components/layout/AppPrimaryTopNavStrip";
import { AppMobileBottomNavSlot } from "@/components/layout/AppMobileBottomNavSlot";
import { AppMobileChromeMetrics } from "@/components/layout/AppMobileChromeMetrics";
import { AppChromeLayoutStableV2 } from "@/components/layout/mobile-v2/AppChromeLayoutStableV2";
import { AppChromeLayoutV3 } from "@/components/layout/mobile-v3/AppChromeLayoutV3";
import { usePathname } from "@/i18n/navigation";
import {
  APP_SHELL_COLUMN_CLASS,
  APP_SHELL_MAIN_CLASS,
  APP_SHELL_MAIN_INNER_CLASS,
  APP_SHELL_ROOT_CLASS,
  APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS,
} from "@/lib/layout/appShellClasses";
import {
  isMobileLayoutStableV2Enabled,
} from "@/lib/layout/mobileLayoutStableV2Flag";
import {
  isMobileLayoutV3Enabled,
  isMobileLayoutV3ShellRoute,
} from "@/lib/layout/mobileLayoutV3Flag";
import { FriendChallengeBootstrap } from "@/components/friendChallenge/FriendChallengeBootstrap";

function AppMainColumn({ children }: { children: React.ReactNode }) {
  return (
    <div data-app-column className={APP_SHELL_COLUMN_CLASS}>
      <AppPrimaryTopNavStrip />
      <main data-app-main className={APP_SHELL_MAIN_CLASS}>
        <div data-app-main-inner className={APP_SHELL_MAIN_INNER_CLASS}>
          <ScoutVerificationBanner />
          {children}
        </div>
      </main>
    </div>
  );
}

/** Production shell (V1) — unchanged when {@link isMobileLayoutStableV2Enabled} is false. */
function AppChromeLayoutV1({ children }: { children: React.ReactNode }) {
  return (
    <>
        <AppLayoutDebugProbe />
        <AppShellDebugOverlay />
        <AppMobileChromeMetrics />
        <div data-app-root className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          <AppMainColumn>{children}</AppMainColumn>
        </div>
        <div
          data-app-mobile-bottom-nav-mount
          className={APP_MOBILE_BOTTOM_NAV_MOUNT_CLASS}
        >
          <AppMobileBottomNavSlot />
        </div>
    </>
  );
}

/**
 * Logged-in shell: desktop sidebar + mobile bottom nav always mounted in-layout.
 * V2 rebuild is opt-in via `NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2=true`.
 * V3 is debug-only — all production routes share one shell so chrome does not swap on navigation.
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useV3Shell =
    isMobileLayoutV3Enabled() && isMobileLayoutV3ShellRoute(pathname);

  return (
    <FeedbackProvider>
      <NotificationsInboxProvider>
        <AdminSupportUnreadProvider>
          <Suspense fallback={null}>
            <FriendChallengeBootstrap />
          </Suspense>
          {useV3Shell ? (
            <AppChromeLayoutV3>{children}</AppChromeLayoutV3>
          ) : isMobileLayoutStableV2Enabled() ? (
            <AppChromeLayoutStableV2>{children}</AppChromeLayoutStableV2>
          ) : (
            <AppChromeLayoutV1>{children}</AppChromeLayoutV1>
          )}
        </AdminSupportUnreadProvider>
      </NotificationsInboxProvider>
    </FeedbackProvider>
  );
}
