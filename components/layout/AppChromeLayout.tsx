"use client";

import { usePathname } from "@/i18n/navigation";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppMobileChromePortal } from "@/components/layout/AppMobileChromePortal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { MobileAppShell } from "@/components/layout/MobileAppShell";
import { ScoutVerificationBanner } from "@/components/layout/ScoutVerificationBanner";
import {
  APP_SHELL_COLUMN_CLASS,
  APP_SHELL_MAIN_CLASS,
  APP_SHELL_MAIN_INNER_CLASS,
  APP_SHELL_ROOT_CLASS,
  MOBILE_APP_SHELL_V2_MAIN_CLASS,
} from "@/lib/layout/appShellClasses";
import { isMobileShellV2Enabled } from "@/lib/layout/mobileShellV2Flag";

function AppMainColumn({ children }: { children: React.ReactNode }) {
  const shellV2 = isMobileShellV2Enabled();
  const pathname = usePathname();
  const routeKey = shellV2 ? pathname : undefined;

  return (
    <div data-app-column className={APP_SHELL_COLUMN_CLASS}>
      <main
        data-app-main
        className={[APP_SHELL_MAIN_CLASS, shellV2 ? MOBILE_APP_SHELL_V2_MAIN_CLASS : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div key={routeKey} data-app-main-inner className={APP_SHELL_MAIN_INNER_CLASS}>
          <ScoutVerificationBanner />
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Logged-in shell: fixed left sidebar (desktop), main column, bottom nav (mobile).
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  const shellV2 = isMobileShellV2Enabled();
  const pathname = usePathname();
  const routeKey = shellV2 ? pathname : undefined;

  return (
    <FeedbackProvider>
      <AdminSupportUnreadProvider>
        <AppLayoutDebugProbe />
        <AppShellDebugOverlay />
        {!shellV2 ? <AppMobileChromePortal /> : null}
        <div key={routeKey} data-app-root className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          {shellV2 ? (
            <MobileAppShell>
              <AppMainColumn key={routeKey}>{children}</AppMainColumn>
            </MobileAppShell>
          ) : (
            <AppMainColumn>{children}</AppMainColumn>
          )}
        </div>
      </AdminSupportUnreadProvider>
    </FeedbackProvider>
  );
}
