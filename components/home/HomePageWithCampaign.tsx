"use client";

import { HomeCleanV3 } from "@/components/home/v3-clean/HomeCleanV3";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";

type Props = {
  initialFeedItems?: AugmentedHomeFeedItem[];
};

/** Production `/home` — full-screen video feed. */
export function HomePageWithCampaign({ initialFeedItems = [] }: Props) {
  return (
    <div className="relative h-full min-h-0 w-full min-w-0 lg:h-auto lg:max-h-none lg:overflow-visible">
      <HomeCleanV3 initialFeedItems={initialFeedItems} />
    </div>
  );
}
