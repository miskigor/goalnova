import type { Metadata } from "next";
import { Suspense } from "react";
import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { NotificationsInboxProvider } from "@/components/notifications/NotificationsInboxContext";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { PublicShell } from "@/components/layout/PublicShell";
import { FriendChallengeBootstrap } from "@/components/friendChallenge/FriendChallengeBootstrap";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function PublicAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PremiumProvider>
      <FeedbackProvider>
        <NotificationsInboxProvider>
          <Suspense fallback={null}>
            <FriendChallengeBootstrap />
          </Suspense>
          <PublicShell>{children}</PublicShell>
        </NotificationsInboxProvider>
      </FeedbackProvider>
    </PremiumProvider>
  );
}
