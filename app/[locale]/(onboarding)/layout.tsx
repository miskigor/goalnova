import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { EmailConfirmationGate } from "@/components/auth/EmailConfirmationGate";
import { RoleOnboardingGate } from "@/components/auth/RoleOnboardingGate";
import { RequireReauthOnReturn } from "@/components/auth/RequireReauthOnReturn";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { MinimalAppHeader } from "@/components/layout/MinimalAppHeader";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { ReferralBootstrap } from "@/components/referrals/ReferralBootstrap";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="protected" redirectTo="/login">
      <EmailConfirmationGate>
      <RoleOnboardingGate mode="require-complete">
        <RequireReauthOnReturn />
        <Suspense fallback={null}>
          <ReferralBootstrap />
        </Suspense>
        <PremiumProvider>
        <NotificationsInboxProvider>
          <FeedbackProvider>
            <div className="relative flex min-h-dvh min-w-0 w-full flex-col overflow-x-clip bg-gn-bg">
              <div className="pointer-events-none absolute inset-0 overflow-x-clip" aria-hidden>
                <div className="absolute -top-40 start-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-gn-accent/[0.12] blur-[120px]" />
                <div className="absolute bottom-0 end-0 h-52 w-52 rounded-full bg-gn-accent/[0.06] blur-[90px]" />
              </div>

              <MinimalAppHeader />

              <main className="relative z-10 flex min-w-0 flex-1 items-center justify-center py-12 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))]">
                <div className="mx-auto w-full min-w-0 max-w-sm">{children}</div>
              </main>
            </div>
          </FeedbackProvider>
        </NotificationsInboxProvider>
        </PremiumProvider>
      </RoleOnboardingGate>
      </EmailConfirmationGate>
    </AuthGate>
  );
}
