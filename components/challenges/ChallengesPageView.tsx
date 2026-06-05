"use client";

import { ChallengesPageHeader } from "@/components/challenges/ChallengesPageHeader";
import { ChallengesHub } from "@/components/challenges/ChallengesHub";
import { ChallengesPageScrollLock } from "@/components/challenges/ChallengesPageScrollLock";

/** Hub layout — same shell pattern as {@link ExploreView} (frame + header inside). */
export function ChallengesPageView() {
  return (
    <>
      <ChallengesPageScrollLock />
      <div className="box-border w-full min-w-0 max-w-full space-y-5 overflow-x-clip sm:space-y-6">
      <section
        data-pitchrusch-explore-frame
        className="box-border w-full min-w-0 max-w-full space-y-4 overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-3 sm:p-5"
        aria-labelledby="challenges-page-title"
      >
        <ChallengesPageHeader />
        <ChallengesHub />
      </section>
    </div>
    </>
  );
}
