import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ReferralBootstrap } from "@/components/referrals/ReferralBootstrap";
import { FriendChallengeBootstrap } from "@/components/friendChallenge/FriendChallengeBootstrap";
import { ClubInviteBootstrap } from "@/components/clubs/ClubInviteBootstrap";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

export const metadata: Metadata = {
  robots: PRIVATE_PAGE_ROBOTS,
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate mode="guest" redirectTo="/home">
      <Suspense fallback={null}>
        <ReferralBootstrap />
        <FriendChallengeBootstrap />
        <ClubInviteBootstrap />
      </Suspense>
      {/* No ViewportScrollLock — iOS / Instagram webviews break inputs when html/body overflow is hidden. */}
      <div className="relative box-border flex min-h-[100svh] w-full min-w-0 max-w-full flex-col items-center justify-start bg-black px-0 py-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:justify-center">
        <div className="relative mx-auto box-border w-full min-w-0 max-w-sm px-4">
          {children}
        </div>
      </div>
    </AuthGate>
  );
}
