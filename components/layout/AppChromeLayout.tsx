"use client";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppMobileChromePortal } from "@/components/layout/AppMobileChromePortal";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { ScoutVerificationBanner } from "@/components/layout/ScoutVerificationBanner";
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
 * Logged-in shell: desktop sidebar + portaled mobile header/bottom nav (V1).
 * Content band sits between fixed chrome; home feed and tab pages share this shell.
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AdminSupportUnreadProvider>
        <AppLayoutDebugProbe />
        <AppShellDebugOverlay />
        <AppMobileChromePortal />
        <div data-app-root className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          <AppMainColumn>{children}</AppMainColumn>
        </div>
      </AdminSupportUnreadProvider>
    </FeedbackProvider>
  );
}
