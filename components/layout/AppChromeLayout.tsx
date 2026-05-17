"use client";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppLayoutDebugProbe } from "@/components/layout/AppLayoutDebugProbe";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
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
        <div data-app-root className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          <div data-app-column className={APP_SHELL_COLUMN_CLASS}>
            <AppMobileHeader />
            <main data-app-main className={APP_SHELL_MAIN_CLASS}>
              <div data-app-main-inner className={APP_SHELL_MAIN_INNER_CLASS}>
                <ScoutVerificationBanner />
                {children}
              </div>
            </main>
          </div>
          <AppMobileBottomNav />
        </div>
      </AdminSupportUnreadProvider>
    </FeedbackProvider>
  );
}
