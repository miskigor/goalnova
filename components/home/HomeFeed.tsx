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
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchHomeFeedData,
  type AugmentedHomeFeedItem,
} from "@/lib/supabase/homeFeed";
import { FeedItemCard } from "@/components/home/FeedItemCard";
import { FeedVideoHeadPreloads } from "@/components/home/FeedVideoHeadPreloads";
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
import { UploadVideoCtaButton } from "@/components/upload/UploadVideoCtaButton";
import { GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
import { useScoutVerification } from "@/hooks/useScoutVerification";

/** Scrollport width: stay within the main column (negative margins removed — they fought min-w-0 and could widen scrollWidth). */
const FEED_BLEED = "w-full min-w-0 max-w-full";

/**
 * Scrollport: one slide per visual page. Each `li` uses `flex-[0_0_100%]` (`grow-0 shrink-0 basis-full`)
 * so slide height matches the scrollport (avoids `100cqh` resolving to 0 in some WebKit layouts).
 */
const FEED_SCROLLPORT =
  "touch-pan-y overflow-y-auto overflow-x-clip scroll-smooth overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden " +
  "[container-type:size] min-h-0 min-w-0 " +
  "max-lg:h-auto max-lg:max-h-none max-lg:overflow-y-visible max-lg:[scroll-snap-type:none] " +
  "lg:snap-y lg:snap-mandatory " +
  "lg:h-[calc(min(100dvh,100svh)-8rem)] lg:max-h-[calc(min(100dvh,100svh)-8rem)] lg:flex-none";

/** Card fills its snap `li`; desktop keeps a subtle framed tile. */
const FEED_SLIDE =
  "h-full min-h-0 min-w-0 w-full max-w-full overflow-visible rounded-none border-0 bg-black " +
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

  return (
    <>
      <FeedVideoHeadPreloads
        firstHref={firstPreloadHref}
        nextHref={nextPreloadHref}
      />
      <ul
        {...feedItemsListProps}
        className="m-0 flex h-full min-h-0 list-none flex-col gap-3 p-0 lg:gap-0"
      >
        {items.map((item, index) => (
          <li
            {...feedItemProps}
            key={
              item.video.id ??
              `${item.video.user_id}-${item.video.created_at ?? ""}-${index}`
            }
            className="min-h-0 min-w-0 w-full shrink-0 grow-0 overflow-x-clip max-lg:basis-auto max-lg:h-[68svh] max-lg:min-h-[26rem] lg:basis-full lg:snap-start lg:snap-always"
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
}: {
  className: string;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { notifyFeedUserActivation } = useHomeFeedSound();

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
  const { loaded: scoutLoaded } = useScoutVerification();

  const [items, setItems] = useState<AugmentedHomeFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoadFailed, setFeedLoadFailed] = useState(false);
  const [myVideos, setMyVideos] = useState<MyVideosStatus>({ state: "loading" });

  const loadDefaultFeed = useCallback(async () => {
    const { items: next, error: err } = await fetchHomeFeedData(supabase);
    if (err) {
      logFullSupabaseError(
        "[PitchRusch home feed] default feed failed",
        new Error(err),
      );
      setFeedLoadFailed(true);
      setItems([]);
    } else {
      setFeedLoadFailed(false);
      setItems(next);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    if (!scoutLoaded) {
      return;
    }
    setLoading(true);
    setFeedLoadFailed(false);
    try {
      await loadDefaultFeed();
    } catch (e) {
      logFullSupabaseError("[PitchRusch home feed] loadFeed unexpected error", e);
      setFeedLoadFailed(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [loadDefaultFeed, scoutLoaded]);

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  useEffect(() => {
    if (!scoutLoaded) return;
    void loadFeedRef.current();
  }, [scoutLoaded]);

  useEffect(() => {
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep a stable in-flow layout on mobile so bottom nav/FAB/actions stay visible.
  const liveImmersiveMobile = false;

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
          <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <UploadVideoCtaButton className="sm:flex-1" />
            <Link
              href="/discover"
              className={`${GN_SECONDARY_BUTTON_CLASS} w-full sm:flex-1`}
            >
              {tFeed("exploreCta")}
            </Link>
          </div>
        </div>
      );
    }
    const bootstrapActiveVideoId =
      items.length > 0 ? feedItemVideoKey(items[0]) : null;

    return (
      <HomeFeedSoundProvider bootstrapActiveVideoId={bootstrapActiveVideoId}>
        <>
          <FeedScrollWithUserAudioActivation
            className={`${FEED_BLEED} ${FEED_SCROLLPORT}`}
          >
            <HomeFeedSnapList
              items={items}
              feedSlideClassName={FEED_SLIDE}
            />
          </FeedScrollWithUserAudioActivation>
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
      <header className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight text-gn-text">
          {tFeed("pageTitle")}
        </h1>
        <p className="text-xs text-gn-text-secondary">
          {t("description")}
        </p>
      </header>

      <div>
        <UploadVideoCtaButton />
      </div>

      <section
        className={[
          "overflow-hidden rounded-none border-0 bg-transparent shadow-none",
        ].join(" ")}
        aria-busy={loading || !scoutLoaded}
        data-pitchrusch-feed-panel
      >
        {renderFeedBody()}
      </section>
    </div>
  );
}
