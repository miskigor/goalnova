import { AuthGate } from "@/components/auth/AuthGate";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { MinimalAppHeader } from "@/components/layout/MinimalAppHeader";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { PremiumProvider } from "@/components/premium/PremiumProvider";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected" redirectTo="/login">
      <PremiumProvider>
        <NotificationsInboxProvider>
          <FeedbackProvider>
            <div className="relative flex min-h-dvh min-w-0 w-full flex-col overflow-x-clip bg-gn-bg">
              <div className="pointer-events-none absolute inset-0 overflow-x-clip" aria-hidden>
                <div className="absolute -top-40 start-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-gn-accent/[0.12] blur-[120px]" />
                <div className="absolute bottom-0 end-0 h-52 w-52 rounded-full bg-gn-accent/[0.06] blur-[90px]" />
              </div>

              <MinimalAppHeader />

              <main className="relative z-10 flex min-w-0 flex-1 items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full min-w-0 max-w-sm">{children}</div>
              </main>
            </div>
          </FeedbackProvider>
        </NotificationsInboxProvider>
      </PremiumProvider>
    </AuthGate>
  );
}
