import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";

/** In-memory feed snapshot — survives client navigations away from `/home`. */
let cachedItems: AugmentedHomeFeedItem[] = [];

export function readHomeCleanV3FeedCache(): AugmentedHomeFeedItem[] {
  return cachedItems;
}

export function hasHomeCleanV3FeedCache(): boolean {
  return cachedItems.length > 0;
}

export function writeHomeCleanV3FeedCache(items: AugmentedHomeFeedItem[]): void {
  if (items.length > 0) {
    cachedItems = items;
  }
}
