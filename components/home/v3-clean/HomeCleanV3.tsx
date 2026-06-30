"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

function mergeFeedItems(
  prev: AugmentedHomeFeedItem[],
  batch: AugmentedHomeFeedItem[],
): AugmentedHomeFeedItem[] {
  const seen = new Set(
    prev.map((i) => i.video.id).filter(Boolean) as string[],
  );
  const merged = [...prev];
  for (const it of batch) {
    const id = it.video.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      merged.push(it);
    }
  }
  return merged;
}

/** Production `/home` — canonical clean feed for all users. Layout locked in homeCleanV3.tokens.css. */
export function HomeCleanV3() {
  const t = useTranslations("homeFeed");
  const cachedOnMount = readHomeCleanV3FeedCache();
  const [items, setItems] = useState<AugmentedHomeFeedItem[]>(() => cachedOnMount);
  const [loading, setLoading] = useState(() => !hasHomeCleanV3FeedCache());
  const [feedLoadFailed, setFeedLoadFailed] = useState(false);
  const [hasMore, setHasMore] = useState(
    () => cachedOnMount.length >= HOME_FEED_PAGE_SIZE,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreInFlightRef = useRef(false);
  /** Next Supabase `range` offset (not filtered list length — avoids gaps when rows are skipped). */
  const dbFetchOffsetRef = useRef(
    cachedOnMount.length > 0 ? HOME_FEED_PAGE_SIZE : 0,
  );

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
      setHasMore(false);
      return;
    }
    setFeedLoadFailed(false);
    const augmented = next as AugmentedHomeFeedItem[];
    dbFetchOffsetRef.current = HOME_FEED_PAGE_SIZE;
    setHasMore(next.length >= HOME_FEED_PAGE_SIZE);
    writeHomeCleanV3FeedCache(augmented);
    setItems(augmented);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (
      loadMoreInFlightRef.current ||
      loadingMore ||
      loading ||
      feedLoadFailed ||
      !hasMore
    ) {
      return;
    }
    loadMoreInFlightRef.current = true;
    setLoadingMore(true);
    const offset = dbFetchOffsetRef.current;
    try {
      const { items: batch, error } = await fetchHomeFeedData(supabase, {
        limit: HOME_FEED_PAGE_SIZE,
        offset,
      });
      if (error) {
        logFullSupabaseError(
          "[Home clean V3] load more failed",
          new Error(error),
        );
        return;
      }
      dbFetchOffsetRef.current = offset + HOME_FEED_PAGE_SIZE;
      if (batch.length < HOME_FEED_PAGE_SIZE) {
        setHasMore(false);
      }
      setItems((prev) => {
        const merged = mergeFeedItems(prev, batch as AugmentedHomeFeedItem[]);
        writeHomeCleanV3FeedCache(merged);
        return merged;
      });
    } catch (err) {
      logFullSupabaseError("[Home clean V3] load more unexpected error", err);
    } finally {
      setLoadingMore(false);
      loadMoreInFlightRef.current = false;
    }
  }, [feedLoadFailed, hasMore, loading, loadingMore]);

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
          setHasMore(false);
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
          <HomeCleanFeedScroll
            items={items}
            onNearEnd={hasMore ? () => void handleLoadMore() : undefined}
            loadingMore={loadingMore}
          />
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
