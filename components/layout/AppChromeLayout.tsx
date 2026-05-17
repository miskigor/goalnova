"use client";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AdminSupportUnreadProvider } from "@/components/layout/AdminSupportUnreadContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";

/**
 * Logged-in shell: fixed left sidebar (desktop), main column, bottom nav (mobile).
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AdminSupportUnreadProvider>
        <div className="relative flex min-h-dvh min-w-0 w-full max-w-full overflow-x-clip bg-gn-bg text-gn-text">
          <AppSidebar />
          {/* No overflow-x on <main>: clip on main breaks WebKit fixed positioning for the home feed. */}
          <div className="flex min-h-dvh min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip ps-0 lg:ps-[15.5rem]">
            <AppMobileHeader />
            <main
              className={[
                "mx-auto box-border flex w-full min-h-0 min-w-0 max-w-full flex-1 flex-col items-stretch",
                "pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:max-w-4xl lg:pt-8",
                "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-12",
                "px-4 sm:px-6",
                "pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]",
                "sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))]",
                "lg:pl-[max(2rem,env(safe-area-inset-left,0px))] lg:pr-[max(2rem,env(safe-area-inset-right,0px))]",
              ].join(" ")}
            >
              <div className="mx-auto w-full min-w-0 max-w-full overflow-x-clip">{children}</div>
            </main>
          </div>
          <AppMobileBottomNav />
        </div>
      </AdminSupportUnreadProvider>
    </FeedbackProvider>
  );
}
