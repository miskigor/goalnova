import { Suspense } from "react";
import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { OnboardingNotificationsBootstrap } from "@/components/notifications/OnboardingNotificationsBootstrap";
import { ReferralBootstrap } from "@/components/referrals/ReferralBootstrap";

/** App providers only — chrome is mounted in `(app)/layout` via {@link AppChromeLayout}. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PremiumProvider>
      <Suspense fallback={null}>
        <ReferralBootstrap />
      </Suspense>
      <OnboardingNotificationsBootstrap />
      {children}
    </PremiumProvider>
  );
}
