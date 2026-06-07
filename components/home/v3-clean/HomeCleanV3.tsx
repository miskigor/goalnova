"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HomeCleanFeedScroll } from "@/components/home/v3-clean/HomeCleanFeedScroll";
import {
  HomeFeedSoundProvider,
} from "@/components/home/HomeFeedSoundContext";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchHomeFeedData,
  HOME_FEED_PAGE_SIZE,
  type AugmentedHomeFeedItem,
} from "@/lib/supabase/homeFeed";
import { supabase } from "@/lib/supabase/client";
import "@/components/home/v3-clean/homeCleanV3.css";

/** Production `/home` — canonical clean feed for all users. Layout locked in homeCleanV3.tokens.css. */
export function HomeCleanV3() {
  const t = useTranslations("homeFeed");
  const { loaded: scoutLoaded } = useScoutVerification();
  const [items, setItems] = useState<AugmentedHomeFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      setItems([]);
      return;
    }
    setFeedLoadFailed(false);
    setItems(next as AugmentedHomeFeedItem[]);
  }, []);

  useEffect(() => {
    if (!scoutLoaded) return;
    let cancelled = false;
    setLoading(true);
    setFeedLoadFailed(false);
    void loadFeed()
      .catch((err) => {
        logFullSupabaseError("[Home clean V3] feed unexpected error", err);
        if (!cancelled) {
          setFeedLoadFailed(true);
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadFeed, scoutLoaded]);

  const bootstrapActiveVideoId =
    items[0] != null ? feedItemVideoKey(items[0]) : null;

  return (
    <HomeFeedSoundProvider
      bootstrapActiveVideoId={bootstrapActiveVideoId}
      defaultSoundEnabled
    >
      <div data-home-clean-v3>
        {loading ? (
          <div data-home-clean-v3-page>
            <div data-home-clean-v3-card data-home-clean-v3-loading>
              <div data-home-clean-v3-fake aria-hidden />
              <div data-home-clean-v3-loading-spinner role="status" aria-busy>
                <span className="sr-only">{t("loadingFeed")}</span>
              </div>
            </div>
          </div>
        ) : items.length > 0 ? (
          <HomeCleanFeedScroll items={items} />
        ) : (
          <div data-home-clean-v3-page>
            <div data-home-clean-v3-card data-home-clean-v3-empty>
              <div data-home-clean-v3-fake aria-hidden />
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
