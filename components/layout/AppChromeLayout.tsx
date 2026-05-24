"use client";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppMobileChromePortal } from "@/components/layout/AppMobileChromePortal";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { ScoutVerificationBanner } from "@/components/layout/ScoutVerificationBanner";
import {
  APP_SHELL_COLUMN_CLASS,
  APP_SHELL_MAIN_CLASS,
  APP_SHELL_MAIN_INNER_CLASS,
  APP_SHELL_ROOT_CLASS,
} from "@/lib/layout/appShellClasses";

/**
 * Logged-in shell: fixed left sidebar (desktop), main column, bottom nav (mobile).
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AdminSupportUnreadProvider>
        <AppLayoutDebugProbe />
        <AppShellDebugOverlay />
        <AppMobileChromePortal />
        <div data-app-root data-app-shell-band className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          <div data-app-column className={APP_SHELL_COLUMN_CLASS}>
            <main data-app-main className={APP_SHELL_MAIN_CLASS}>
              <div
                data-app-main-inner
                className={`${APP_SHELL_MAIN_INNER_CLASS} max-lg:w-full max-lg:max-w-full max-lg:min-w-0`}
              >
                <ScoutVerificationBanner />
                {children}
              </div>
            </main>
          </div>
        </div>
      </AdminSupportUnreadProvider>
    </FeedbackProvider>
  );
}
