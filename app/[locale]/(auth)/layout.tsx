import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { ViewportScrollLock } from "@/components/layout/ViewportScrollLock";
import { ReferralBootstrap } from "@/components/referrals/ReferralBootstrap";
import { FriendChallengeBootstrap } from "@/components/friendChallenge/FriendChallengeBootstrap";
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
      </Suspense>
      <ViewportScrollLock />
      <div
        className="relative box-border flex min-h-[100svh] w-full min-w-0 max-w-full flex-col items-center justify-center overflow-x-clip overflow-y-auto overscroll-y-none bg-black pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]"
      >
        <div className="relative mx-auto box-border w-full min-w-0 max-w-sm px-4">
          {children}
        </div>
      </div>
    </AuthGate>
  );
}
