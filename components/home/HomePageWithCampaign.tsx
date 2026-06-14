"use client";

import { HomeCleanV3 } from "@/components/home/v3-clean/HomeCleanV3";
import { RoadToWorldCup2026Banner } from "@/components/campaign/RoadToWorldCup2026Banner";

/** `/home` — full-bleed top banner; opaque bar so feed does not show through while scrolling. */
export function HomePageWithCampaign() {
  return (
    <div className="relative h-full min-h-0 w-full min-w-0">
      <HomeCleanV3 />
      <div data-world-cup-campaign-banner-slot>
        <div data-world-cup-campaign-banner-bar>
          <RoadToWorldCup2026Banner variant="home" />
        </div>
      </div>
    </div>
  );
}
