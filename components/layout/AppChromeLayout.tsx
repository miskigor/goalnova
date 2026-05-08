"use client";

import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppMobileHeader } from "@/components/layout/AppMobileHeader";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { FloatingUploadFab } from "@/components/upload/FloatingUploadFab";

/**
 * Logged-in shell: fixed left sidebar (desktop), main column, bottom nav (mobile).
 */
export function AppChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <div className="relative flex min-h-dvh min-w-0 w-full max-w-full bg-gn-bg text-gn-text">
        <AppSidebar />
        {/* No overflow-x on this column or <main>: overflow clip on ancestors breaks WebKit’s
            fixed positioning for the immersive home feed (rail/icons shift off-screen). */}
        <div className="flex min-h-dvh min-w-0 max-w-full flex-1 flex-col ps-0 lg:ps-[15.5rem]">
          <AppMobileHeader />
          <main className="mx-auto box-border w-full min-h-0 min-w-0 max-w-lg flex-1 px-3 pb-28 pt-[calc(5rem+env(safe-area-inset-top,0px))] sm:px-5 sm:pb-28 md:max-w-2xl lg:max-w-4xl lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>
        <AppMobileBottomNav />
        <FloatingUploadFab />
      </div>
    </FeedbackProvider>
  );
}
