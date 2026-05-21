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
        <div data-app-mobile-chrome className="pointer-events-none fixed inset-0 z-[600] flex max-lg:flex-col max-lg:overflow-hidden lg:hidden">
          <div className="pointer-events-auto shrink-0">
            <AppMobileHeader />
          </div>
          <div className="min-h-0 flex-1" aria-hidden />
          <div className="pointer-events-auto shrink-0">
            <AppMobileBottomNav />
          </div>
        </div>
        <div data-app-root className={APP_SHELL_ROOT_CLASS}>
          <AppSidebar />
          <div data-app-column className={APP_SHELL_COLUMN_CLASS}>
            <main data-app-main className={APP_SHELL_MAIN_CLASS}>
              <div data-app-main-inner className={APP_SHELL_MAIN_INNER_CLASS}>
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
