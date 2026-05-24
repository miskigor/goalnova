import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { PublicShell } from "@/components/layout/PublicShell";

export default function PublicAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PremiumProvider>
      <NotificationsInboxProvider>
        <FeedbackProvider>
          <PublicShell>{children}</PublicShell>
        </FeedbackProvider>
      </NotificationsInboxProvider>
    </PremiumProvider>
  );
}
