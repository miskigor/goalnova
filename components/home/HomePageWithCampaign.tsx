"use client";

import { HomeCleanV3 } from "@/components/home/v3-clean/HomeCleanV3";

/** Production `/home` — full-screen video feed. */
export function HomePageWithCampaign() {
  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col lg:h-auto lg:max-h-none lg:flex-none lg:overflow-visible">
      <HomeCleanV3 />
    </div>
  );
}
