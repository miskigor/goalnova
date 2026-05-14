import { Suspense } from "react";
import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { OnboardingNotificationsBootstrap } from "@/components/notifications/OnboardingNotificationsBootstrap";
import { AppChromeLayout } from "@/components/layout/AppChromeLayout";
import { ReferralBootstrap } from "@/components/referrals/ReferralBootstrap";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PremiumProvider>
      <NotificationsInboxProvider>
        <Suspense fallback={null}>
          <ReferralBootstrap />
        </Suspense>
        <OnboardingNotificationsBootstrap />
        <AppChromeLayout>{children}</AppChromeLayout>
      </NotificationsInboxProvider>
    </PremiumProvider>
  );
}
