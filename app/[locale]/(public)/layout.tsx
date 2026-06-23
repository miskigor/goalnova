import { Suspense } from "react";
import { PremiumProvider } from "@/components/premium/PremiumProvider";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { PublicShell } from "@/components/layout/PublicShell";
import { FriendChallengeBootstrap } from "@/components/friendChallenge/FriendChallengeBootstrap";

export default function PublicAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PremiumProvider>
      <FeedbackProvider>
        <Suspense fallback={null}>
          <FriendChallengeBootstrap />
        </Suspense>
        <PublicShell>{children}</PublicShell>
      </FeedbackProvider>
    </PremiumProvider>
  );
}
