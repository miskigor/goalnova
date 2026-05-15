"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAdminSupportUnread } from "@/components/layout/AdminSupportUnreadContext";
import { ReferralConsumeOnMount } from "@/components/referrals/ReferralConsumeOnMount";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchHomeFeedData,
  HOME_FEED_PAGE_SIZE,
  type AugmentedHomeFeedItem,
} from "@/lib/supabase/homeFeed";
import { FeedItemCard } from "@/components/home/FeedItemCard";
import { FeedVideoHeadPreloads } from "@/components/home/FeedVideoHeadPreloads";
import { HomeFeedMediaGestureUnlock } from "@/components/home/HomeFeedMediaGestureUnlock";
import {
  HomeFeedSoundProvider,
  useHomeFeedSound,
} from "@/components/home/HomeFeedSoundContext";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import {
  homeFeedPlaybackCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";
import {
  feedItemsListProps,
  feedItemProps,
  feedScrollRootProps,
} from "@/lib/feed/feedScrollContract";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { useScoutVerification } from "@/hooks/useScoutVerification";

/** Scrollport width: stay within the main column (negative margins removed — they fought min-w-0 and could widen scrollWidth). */
const FEED_BLEED = "w-full min-w-0 max-w-full";

/**
 * Scrollport: one slide per visual page. Each `li` uses `flex-[0_0_100%]` (`grow-0 shrink-0 basis-full`)
 * so slide height matches the scrollport (avoids `100cqh` resolving to 0 in some WebKit layouts).
 */
const FEED_SCROLLPORT =
  "touch-pan-y snap-y snap-mandatory overflow-y-auto overflow-x-clip scroll-smooth overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden " +
  "[container-type:size] min-h-0 min-w-0 " +
  "max-lg:flex-1 max-lg:h-full max-lg:min-h-[min(100dvh,100svh)] " +
  "lg:h-[calc(min(100dvh,100svh)-8rem)] lg:max-h-[calc(min(100dvh,100svh)-8rem)] lg:flex-none";

/** Card fills its snap `li`; desktop keeps a subtle framed tile. */
const FEED_SLIDE =
  "h-full min-h-0 min-w-0 w-full max-w-full overflow-visible rounded-none border-0 bg-black " +
  "max-lg:min-h-[100dvh] max-lg:h-[100dvh] " +
  "lg:h-[100cqh] lg:max-h-[100cqh] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.06]";

type MyVideosStatus =
  | { state: "loading" }
  | { state: "ready"; count: number }
  | { state: "unknown" };

function HomeFeedSnapList({
  items,
  feedSlideClassName,
}: {
  items: AugmentedHomeFeedItem[];
  feedSlideClassName: string;
}) {
  const { activeVideoId } = useHomeFeedSound();

  const activeFeedIndex = useMemo(() => {
    if (!activeVideoId) return 0;
    const i = items.findIndex((it) => feedItemVideoKey(it) === activeVideoId);
    return i >= 0 ? i : 0;
  }, [items, activeVideoId]);

  const firstPreloadHref = useMemo(() => {
    if (items.length === 0) return null;
    const c = homeFeedPlaybackCandidates(items[0].video);
    const href = (c[0] ?? videoPlaybackUrl(items[0].video)).trim();
    return href.length > 0 ? href : null;
  }, [items]);

  const nextPreloadHref = useMemo(() => {
    if (activeFeedIndex + 1 >= items.length) return null;
    const v = items[activeFeedIndex + 1].video;
    const c = homeFeedPlaybackCandidates(v);
    const href = (c[0] ?? videoPlaybackUrl(v)).trim();
    return href.length > 0 ? href : null;
  }, [items, activeFeedIndex]);

  const thirdPreloadHref = useMemo(() => {
    if (activeFeedIndex + 2 >= items.length) return null;
    const v = items[activeFeedIndex + 2].video;
    const c = homeFeedPlaybackCandidates(v);
    const href = (c[0] ?? videoPlaybackUrl(v)).trim();
    return href.length > 0 ? href : null;
  }, [items, activeFeedIndex]);

  return (
    <>
      <FeedVideoHeadPreloads
        firstHref={firstPreloadHref}
        nextHref={nextPreloadHref}
        thirdHref={thirdPreloadHref}
      />
      <ul
        {...feedItemsListProps}
        className="m-0 flex h-full min-h-0 list-none flex-col gap-0 p-0"
      >
        {items.map((item, index) => (
          <li
            {...feedItemProps}
            key={
              item.video.id ??
              `${item.video.user_id}-${item.video.created_at ?? ""}-${index}`
            }
            className="min-h-0 min-w-0 w-full shrink-0 grow-0 basis-full snap-start snap-always overflow-x-clip"
          >
            <FeedItemCard
              item={item}
              slideClassName={feedSlideClassName}
              feedIndex={index}
              activeFeedIndex={activeFeedIndex}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function FeedScrollWithUserAudioActivation({
  className,
  children,
  onNearEnd,
  snapVideoKeys,
}: {
  className: string;
  children: React.ReactNode;
  /** When the user scrolls within ~65% viewport height of the list bottom (throttled). */
  onNearEnd?: () => void;
  /** Ordered feed keys for scroll-snap index → early `activeVideoId` boost (mobile TikTok handoff). */
  snapVideoKeys?: readonly string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { notifyFeedUserActivation, reportScrollSnapBoost } = useHomeFeedSound();
  const lastNearEndAtRef = useRef(0);
  const scrollBoostRafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const unlock = () => {
      notifyFeedUserActivation();
    };
    el.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    el.addEventListener("touchstart", unlock, { capture: true, passive: true });
    el.addEventListener("wheel", unlock, { capture: true, passive: true });
    el.addEventListener("scroll", unlock, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", unlock, { capture: true });
      el.removeEventListener("touchstart", unlock, { capture: true });
      el.removeEventListener("wheel", unlock, { capture: true });
      el.removeEventListener("scroll", unlock);
    };
  }, [notifyFeedUserActivation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !snapVideoKeys?.length) return;

    const applySnapBoost = () => {
      const ch = el.clientHeight;
      if (ch < 8) return;
      const idx = Math.min(
        snapVideoKeys.length - 1,
        Math.max(0, Math.round(el.scrollTop / ch)),
      );
      const id = snapVideoKeys[idx];
      if (id) reportScrollSnapBoost(id);
    };

    const onScroll = () => {
      if (scrollBoostRafRef.current != null) return;
      scrollBoostRafRef.current = window.requestAnimationFrame(() => {
        scrollBoostRafRef.current = null;
        applySnapBoost();
      });
    };

    applySnapBoost();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (scrollBoostRafRef.current != null) {
        window.cancelAnimationFrame(scrollBoostRafRef.current);
        scrollBoostRafRef.current = null;
      }
    };
  }, [reportScrollSnapBoost, snapVideoKeys]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onNearEnd) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (clientHeight <= 0 || scrollHeight <= 0) return;
      const distFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distFromBottom > clientHeight * 0.65) return;
      const now = Date.now();
      if (now - lastNearEndAtRef.current < 650) return;
      lastNearEndAtRef.current = now;
      onNearEnd();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onNearEnd]);

  return (
    <div {...feedScrollRootProps} ref={scrollRef} className={className}>
      {children}
    </div>
  );
}

function FeedSpinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-gn-accent"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

export function HomeFeed() {
  const t = useTranslations("home");
  const tFeed = useTranslations("homeFeed");
  const adminSupportUnread = useAdminSupportUnread();
  const { loaded: scoutLoaded } = useScoutVerification();

  const [items, setItems] = useState<AugmentedHomeFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoadFailed, setFeedLoadFailed] = useState(false);
  const [myVideos, setMyVideos] = useState<MyVideosStatus>({ state: "loading" });
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreInFlightRef = useRef(false);

  const loadInitialFeed = useCallback(async () => {
    const { items: next, error: err } = await fetchHomeFeedData(supabase, {
      limit: HOME_FEED_PAGE_SIZE,
      offset: 0,
    });
    if (err) {
      logFullSupabaseError(
        "[PitchRusch home feed] default feed failed",
        new Error(err),
      );
      setFeedLoadFailed(true);
      setItems([]);
      setHasMore(false);
    } else {
      setFeedLoadFailed(false);
      setItems(next as AugmentedHomeFeedItem[]);
      setHasMore(next.length >= HOME_FEED_PAGE_SIZE);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    if (!scoutLoaded) {
      return;
    }
    setLoading(true);
    setFeedLoadFailed(false);
    loadMoreInFlightRef.current = false;
    try {
      await loadInitialFeed();
    } catch (e) {
      logFullSupabaseError("[PitchRusch home feed] loadFeed unexpected error", e);
      setFeedLoadFailed(true);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loadInitialFeed, scoutLoaded]);

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
    const offset = items.length;
    try {
      const { items: batch, error: err } = await fetchHomeFeedData(supabase, {
        limit: HOME_FEED_PAGE_SIZE,
        offset,
      });
      if (err) {
        logFullSupabaseError(
          "[PitchRusch home feed] load more failed",
          new Error(err),
        );
        return;
      }
      if (batch.length < HOME_FEED_PAGE_SIZE) {
        setHasMore(false);
      }
      setItems((prev) => {
        const seen = new Set(
          prev.map((i) => i.video.id).filter(Boolean) as string[],
        );
        const merged = [...prev];
        for (const it of batch) {
          const id = it.video.id;
          if (id && !seen.has(id)) {
            seen.add(id);
            merged.push(it as AugmentedHomeFeedItem);
          }
        }
        return merged;
      });
    } catch (e) {
      logFullSupabaseError("[PitchRusch home feed] load more unexpected", e);
    } finally {
      setLoadingMore(false);
      loadMoreInFlightRef.current = false;
    }
  }, [
    feedLoadFailed,
    hasMore,
    items.length,
    loading,
    loadingMore,
  ]);

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  useEffect(() => {
    if (!scoutLoaded) return;
    void loadFeedRef.current();
  }, [scoutLoaded]);

  /** Deferred so first paint + feed fetch are not competing with an auth + count round-trip. */
  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setMyVideos({ state: "loading" });
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        if (!uid) {
          if (!cancelled) setMyVideos({ state: "unknown" });
          return;
        }
        const { count, error: countErr } = await supabase
          .from("videos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        if (cancelled) return;
        if (countErr) {
          logFullSupabaseError("[PitchRusch home feed] my videos count failed", countErr);
          setMyVideos({ state: "unknown" });
          return;
        }
        setMyVideos({ state: "ready", count: count ?? 0 });
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, []);

  /** Full-viewport feed on small screens (video edge-to-edge; shell chrome overlays). */
  const liveImmersiveMobile =
    scoutLoaded &&
    !loading &&
    !feedLoadFailed &&
    items.length > 0;

  function renderFeedBody() {
    if (!scoutLoaded || loading) {
      return (
        <div
          className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-12 text-sm text-gn-text-secondary"
          role="status"
        >
          <FeedSpinner />
          {tFeed("loadingFeed")}
        </div>
      );
    }
    if (feedLoadFailed) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-gn-accent/35 bg-gn-accent/10 px-4 py-4 text-sm text-gn-text"
        >
          <p className="font-medium">{tFeed("errorTitle")}</p>
          <p className="mt-1 text-gn-text-secondary">{tFeed("errorBody")}</p>
          <button
            type="button"
            onClick={() => void loadFeed()}
            disabled={loading}
            className="mt-3 rounded-lg border border-gn-border px-3 py-2 text-xs font-medium text-gn-text-secondary hover:bg-gn-surface disabled:opacity-50"
          >
            {tFeed("retry")}
          </button>
        </div>
      );
    }
    if (items.length === 0) {
      const showFirstUploadHint =
        myVideos.state === "ready" && myVideos.count === 0;
      return (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-12 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-sm font-medium text-gn-text">
              {showFirstUploadHint ? tFeed("emptyFirstVideo") : tFeed("empty")}
            </p>
            <p className="text-sm text-gn-text-secondary">
              {tFeed("emptySubtitle")}
            </p>
          </div>
          <div className="flex w-full max-w-sm justify-center">
            <Link
              href="/discover"
              className={`${GN_SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              {tFeed("exploreCta")}
            </Link>
          </div>
        </div>
      );
    }
    const bootstrapActiveVideoId =
      items.length > 0 ? feedItemVideoKey(items[0]) : null;

    const snapVideoKeys = items.map((it) => feedItemVideoKey(it)) as readonly string[];

    return (
      <HomeFeedSoundProvider bootstrapActiveVideoId={bootstrapActiveVideoId}>
        <>
          <FeedScrollWithUserAudioActivation
            className={`${FEED_BLEED} ${FEED_SCROLLPORT}`}
            onNearEnd={hasMore ? handleLoadMore : undefined}
            snapVideoKeys={snapVideoKeys}
          >
            <HomeFeedSnapList
              items={items}
              feedSlideClassName={FEED_SLIDE}
            />
          </FeedScrollWithUserAudioActivation>
          <HomeFeedMediaGestureUnlock />
        </>
      </HomeFeedSoundProvider>
    );
  }

  return (
    <div
      className={[
        "mx-auto flex w-full min-w-0 max-w-lg min-h-0 flex-col gap-3 pb-3 lg:max-w-2xl",
        liveImmersiveMobile
          ? "max-lg:fixed max-lg:inset-0 max-lg:z-[20] max-lg:m-0 max-lg:h-[min(100dvh,100svh)] max-lg:max-h-[min(100dvh,100svh)] max-lg:min-h-0 max-lg:min-w-0 max-lg:w-full max-lg:max-w-full max-lg:flex max-lg:flex-col max-lg:gap-0 max-lg:overflow-x-clip max-lg:overflow-y-hidden max-lg:bg-black max-lg:px-0 max-lg:pb-0"
          : "",
      ].join(" ")}
    >
      <ReferralConsumeOnMount />
      <header
        className={[
          "space-y-0.5",
          liveImmersiveMobile ? "max-lg:hidden" : "",
        ].join(" ")}
      >
        <h1 className="text-xl font-semibold tracking-tight text-gn-text">
          {tFeed("pageTitle")}
        </h1>
        <p className="text-xs text-gn-text-secondary">
          {t("description")}
        </p>
        {adminSupportUnread > 0 ? (
          <Link
            href="/admin"
            className="mt-3 inline-flex w-full max-w-md rounded-xl border border-gn-accent/35 bg-gn-accent/10 px-3 py-2.5 text-left text-sm font-medium leading-snug text-gn-accent transition hover:bg-gn-accent/18"
          >
            {tFeed("adminSupportInboxHint", { count: adminSupportUnread })}
          </Link>
        ) : null}
      </header>

      <section
        className={[
          "overflow-hidden rounded-none border-0 bg-transparent shadow-none",
          liveImmersiveMobile
            ? "relative z-0 max-lg:flex max-lg:min-h-0 max-lg:min-w-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-x-clip max-lg:pt-0"
            : "",
        ].join(" ")}
        aria-busy={loading || !scoutLoaded}
        data-pitchrusch-feed-panel
      >
        {renderFeedBody()}
      </section>
    </div>
  );
}
