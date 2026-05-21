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
        {/*
          Header + bottom nav pinned to viewport edges (not flex-end of inset-0), so iOS Safari
          does not place the tab bar below the visible area when the URL bar is shown.
        */}
        <div
          data-app-mobile-chrome
          className="pointer-events-none fixed inset-x-0 top-0 z-[600] h-svh max-h-svh w-full max-w-full overflow-visible lg:hidden"
        >
          <div className="pointer-events-auto fixed inset-x-0 top-0 z-[1]">
            <AppMobileHeader />
          </div>
          <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[1]">
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
