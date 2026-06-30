"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HomeCleanFeedScroll } from "@/components/home/v3-clean/HomeCleanFeedScroll";
import {
  HomeFeedSoundProvider,
} from "@/components/home/HomeFeedSoundContext";
import {
  hasHomeCleanV3FeedCache,
  readHomeCleanV3FeedCache,
  writeHomeCleanV3FeedCache,
} from "@/components/home/v3-clean/homeCleanV3FeedCache";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchHomeFeedData,
  HOME_FEED_PAGE_SIZE,
  type AugmentedHomeFeedItem,
} from "@/lib/supabase/homeFeed";
import { supabase } from "@/lib/supabase/client";
import "@/components/home/v3-clean/homeCleanV3.css";
import { HOME_CLEAN_V3_CARD_LOCK_STYLE } from "@/components/home/v3-clean/homeCleanV3LayoutLock";

/** Production `/home` — canonical clean feed for all users. Layout locked in homeCleanV3.tokens.css. */
export function HomeCleanV3() {
  const t = useTranslations("homeFeed");
  const [items, setItems] = useState<AugmentedHomeFeedItem[]>(() =>
    readHomeCleanV3FeedCache(),
  );
  const [loading, setLoading] = useState(() => !hasHomeCleanV3FeedCache());
  const [feedLoadFailed, setFeedLoadFailed] = useState(false);

  const loadFeed = useCallback(async () => {
    const { items: next, error } = await fetchHomeFeedData(supabase, {
      limit: HOME_FEED_PAGE_SIZE,
      offset: 0,
    });
    if (error) {
      logFullSupabaseError(
        "[Home clean V3] feed load failed",
        new Error(error),
      );
      setFeedLoadFailed(true);
      setItems((prev) => (prev.length > 0 ? prev : []));
      return;
    }
    setFeedLoadFailed(false);
    const augmented = next as AugmentedHomeFeedItem[];
    writeHomeCleanV3FeedCache(augmented);
    setItems(augmented);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hadCache = hasHomeCleanV3FeedCache();
    if (!hadCache) {
      setLoading(true);
      setFeedLoadFailed(false);
    }
    void loadFeed()
      .catch((err) => {
        logFullSupabaseError("[Home clean V3] feed unexpected error", err);
        if (!cancelled) {
          setFeedLoadFailed(true);
          setItems((prev) => (prev.length > 0 ? prev : []));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadFeed]);

  const bootstrapActiveVideoId =
    items[0] != null ? feedItemVideoKey(items[0]) : null;

  const showInitialLoading = loading && items.length === 0;

  return (
    <HomeFeedSoundProvider
      bootstrapActiveVideoId={bootstrapActiveVideoId}
      defaultSoundEnabled
    >
      <div data-home-clean-v3>
        {showInitialLoading ? (
          <div data-home-clean-v3-page>
            <div
              data-home-clean-v3-card
              data-home-clean-v3-loading
              style={HOME_CLEAN_V3_CARD_LOCK_STYLE}
            >
              <div data-home-clean-v3-loading-spinner role="status" aria-busy>
                <span className="sr-only">{t("loadingFeed")}</span>
              </div>
            </div>
          </div>
        ) : items.length > 0 ? (
          <HomeCleanFeedScroll items={items} />
        ) : (
          <div data-home-clean-v3-page>
            <div
              data-home-clean-v3-card
              data-home-clean-v3-empty
              style={HOME_CLEAN_V3_CARD_LOCK_STYLE}
            >
              <p data-home-clean-v3-empty-text>
                {feedLoadFailed ? t("errorBody") : t("empty")}
              </p>
            </div>
          </div>
        )}
      </div>
    </HomeFeedSoundProvider>
  );
}
