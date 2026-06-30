import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";

const SESSION_CACHE_KEY = "pitchrusch_home_clean_v3_feed_v1";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

/** In-memory feed snapshot — survives client navigations away from `/home`. */
let cachedItems: AugmentedHomeFeedItem[] = [];

function readSessionFeedCache(): AugmentedHomeFeedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      at?: number;
      items?: AugmentedHomeFeedItem[];
    };
    if (!parsed.at || Date.now() - parsed.at > SESSION_CACHE_TTL_MS) return [];
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeSessionFeedCache(items: AugmentedHomeFeedItem[]): void {
  if (typeof window === "undefined" || items.length === 0) return;
  try {
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({ at: Date.now(), items }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readHomeCleanV3FeedCache(): AugmentedHomeFeedItem[] {
  if (cachedItems.length > 0) return cachedItems;
  const fromSession = readSessionFeedCache();
  if (fromSession.length > 0) {
    cachedItems = fromSession;
  }
  return cachedItems;
}

export function hasHomeCleanV3FeedCache(): boolean {
  return readHomeCleanV3FeedCache().length > 0;
}

export function writeHomeCleanV3FeedCache(items: AugmentedHomeFeedItem[]): void {
  if (items.length > 0) {
    cachedItems = items;
    writeSessionFeedCache(items);
  }
}

export function seedHomeCleanV3FeedCache(items: AugmentedHomeFeedItem[]): void {
  if (items.length > 0) {
    cachedItems = items;
    writeSessionFeedCache(items);
  }
}
