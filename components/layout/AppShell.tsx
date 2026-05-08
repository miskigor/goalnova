import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { OnboardingNotificationsBootstrap } from "@/components/notifications/OnboardingNotificationsBootstrap";
import { AppChromeLayout } from "@/components/layout/AppChromeLayout";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PremiumProvider>
      <NotificationsInboxProvider>
        <OnboardingNotificationsBootstrap />
        <AppChromeLayout>{children}</AppChromeLayout>
      </NotificationsInboxProvider>
    </PremiumProvider>
  );
}
