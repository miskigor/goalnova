"use client";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { ScoutVerificationBanner } from "@/components/layout/ScoutVerificationBanner";
import { AppMobileBottomNavPortal } from "@/components/layout/AppMobileBottomNavPortal";
import { AppMobileChromeMetrics } from "@/components/layout/AppMobileChromeMetrics";
import {
  APP_SHELL_COLUMN_CLASS,
  APP_SHELL_MAIN_CLASS,
  APP_SHELL_MAIN_INNER_CLASS,
  APP_SHELL_ROOT_CLASS,
} from "@/lib/layout/appShellClasses";

function AppMainColumn({ children }: { children: React.ReactNode }) {
  return (
    <div data-app-column className={APP_SHELL_COLUMN_CLASS}>
      <main data-app-main className={APP_SHELL_MAIN_CLASS}>
        <div data-app-main-inner className={APP_SHELL_MAIN_INNER_CLASS}>
          <ScoutVerificationBanner />
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Logged-in shell: desktop sidebar + mobile bottom nav always mounted in-layout.
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AdminSupportUnreadProvider>
        <AppLayoutDebugProbe />
        <AppShellDebugOverlay />
        <AppMobileChromeMetrics />
        <div data-app-root className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          <AppMainColumn>{children}</AppMainColumn>
        </div>
        <AppMobileBottomNavPortal />
      </AdminSupportUnreadProvider>
    </FeedbackProvider>
  );
}
