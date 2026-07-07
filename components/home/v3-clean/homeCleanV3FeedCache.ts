import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";

const SESSION_KEY = "pitchrusch:home-clean-v3-feed";
const SESSION_TTL_MS = 5 * 60 * 1000;

/** In-memory feed snapshot — survives client navigations away from `/home`. */
let cachedItems: AugmentedHomeFeedItem[] = [];

type SessionPayload = {
  savedAt: number;
  items: AugmentedHomeFeedItem[];
};

function readSessionCache(): AugmentedHomeFeedItem[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionPayload;
    if (
      !parsed ||
      typeof parsed.savedAt !== "number" ||
      !Array.isArray(parsed.items)
    ) {
      return [];
    }
    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return [];
    }
    return parsed.items;
  } catch {
    return [];
  }
}

function writeSessionCache(items: AugmentedHomeFeedItem[]): void {
  if (typeof sessionStorage === "undefined" || items.length === 0) return;
  try {
    const payload: SessionPayload = { savedAt: Date.now(), items };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readHomeCleanV3FeedCache(): AugmentedHomeFeedItem[] {
  if (cachedItems.length > 0) return cachedItems;
  const fromSession = readSessionCache();
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
    writeSessionCache(items);
  }
}
