"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import "@/components/home/v3/mobileLayoutV3HomeFeed.css";
import {
  HomeFeedCardFrameV3,
  HomeFeedV3ItemStage,
  HomeFeedV3SnapItem,
  HomeFeedV3SnapItems,
  HomeFeedV3SnapShell,
  logHomeV3FrameCompare,
} from "@/components/home/v3/HomeFeedCardFrameV3";
import { FeedSoundRailButton } from "@/components/home/FeedSoundRailButton";
import { FeedVideoEngagement } from "@/components/home/FeedVideoEngagement";
import { FeedVideoHeadPreloads } from "@/components/home/FeedVideoHeadPreloads";
import {
  HomeFeedSoundProvider,
  useHomeFeedSound,
} from "@/components/home/HomeFeedSoundContext";
import {
  PlaybackVideo,
  type PlaybackVideoHandle,
} from "@/components/video/PlaybackVideo";
import { ChallengeTagPill } from "@/components/challenges/ChallengeTagPill";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { VideoRailTrailingActions } from "@/components/video/VideoRailTrailingActions";
import { VideoMusicCredit } from "@/components/video/VideoMusicCredit";
import {
  challengeDisplayTitle,
  challengeLinkSegment,
} from "@/lib/challenges/challengeRowUtils";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import { buildPlayerProfilePath } from "@/lib/player/buildPlayerProfilePath";
import { isDev } from "@/lib/devLog";
import {
  isMobileLayoutV3Enabled,
  isMobileLayoutV3HomeFeedRoute,
} from "@/lib/layout/mobileLayoutV3Flag";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  fetchHomeFeedData,
  HOME_FEED_PAGE_SIZE,
  type AugmentedHomeFeedItem,
} from "@/lib/supabase/homeFeed";
import { supabase } from "@/lib/supabase/client";
import {
  homeFeedPlaybackCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";
import {
  applyHomeV3FeedMetrics,
  buildHomeV3FeedMetricsLog,
  resetHomeMockV3HorizontalScroll,
  useMobileShellV3HomeFeedMetrics,
} from "@/hooks/useMobileShellV3HomeMetrics";

const MLV3_HOME_FEED_MAIN_SELECTOR =
  '[data-mlv3-main][data-mlv3-route="home-feed"]';

const FEED_FETCH_TIMEOUT_MS = 12_000;
const AUTH_CHECK_TIMEOUT_MS = 5_000;
const FEED_TIMEOUT_MESSAGE =
  "Feed se trenutno nije učitao. Pokušaj ponovno.";

type HomeV3FeedFetchLog = {
  phase: string;
  locale: string;
  userId: string | null;
  startedAt: number;
  elapsedMs: number;
  success: boolean;
  count: number | null;
  error: string | null;
  hasSession: boolean;
  authLoading: boolean;
  filters: { limit: number; offset: number };
};

function logHomeV3FeedFetch(payload: HomeV3FeedFetchLog): void {
  if (!isDev || typeof console === "undefined") return;
  console.info("[Home V3 feed fetch]", payload);
}

function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutError));
    }, timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

async function fetchHomeFeedV3Initial(
  locale: string,
): Promise<{ items: AugmentedHomeFeedItem[]; error: string | null }> {
  const startedAt = Date.now();
  let userId: string | null = null;
  let hasSession = false;
  let authLoading = true;
  const filters = { limit: HOME_FEED_PAGE_SIZE, offset: 0 };

  const emit = (
    phase: string,
    partial: Partial<
      Pick<HomeV3FeedFetchLog, "success" | "count" | "error">
    > = {},
  ) => {
    logHomeV3FeedFetch({
      phase,
      locale,
      userId,
      startedAt,
      elapsedMs: Date.now() - startedAt,
      success: partial.success ?? false,
      count: partial.count ?? null,
      error: partial.error ?? null,
      hasSession,
      authLoading,
      filters,
    });
  };

  emit("start");

  try {
    emit("auth_check_start");
    const sessionResult = await raceWithTimeout(
      supabase.auth.getSession(),
      AUTH_CHECK_TIMEOUT_MS,
      "auth_timeout",
    );
    authLoading = false;
    hasSession = Boolean(sessionResult.data.session);
    userId = sessionResult.data.session?.user?.id ?? null;
    emit("auth_check_done", { success: true });

    emit("fetch_start");
    const { items, error } = await raceWithTimeout(
      fetchHomeFeedData(supabase, filters),
      FEED_FETCH_TIMEOUT_MS,
      "feed_timeout",
    );

    if (error) {
      emit("fetch_error", { success: false, count: 0, error });
      return { items: [], error };
    }

    emit("fetch_done", { success: true, count: items.length, error: null });
    return { items: items as AugmentedHomeFeedItem[], error: null };
  } catch (err) {
    authLoading = false;
    const message =
      err instanceof Error ? err.message : "feed_fetch_failed";
    const error =
      message === "feed_timeout"
        ? FEED_TIMEOUT_MESSAGE
        : message === "auth_timeout"
          ? FEED_TIMEOUT_MESSAGE
          : message;
    emit(message === "feed_timeout" ? "fetch_timeout" : "fetch_throw", {
      success: false,
      count: 0,
      error,
    });
    if (message !== "feed_timeout" && message !== "auth_timeout") {
      logFullSupabaseError("[PitchRusch home feed v3] fetch throw", err);
    }
    return { items: [], error };
  }
}

function buildV3PlaybackSources(video: AugmentedHomeFeedItem["video"]): string[] {
  const processed = (video.processed_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  return Array.from(new Set([processed, primary, source].filter(Boolean)));
}

type HomeV3VideoErrorPayload = {
  videoId: string | null;
  processedVideoUrl: string | null;
  videoUrl: string | null;
  sourceVideoUrl: string | null;
  currentUrl: string | null;
  error: string | null;
  networkState: number | null;
  readyState: number | null;
};

function logHomeV3VideoError(payload: HomeV3VideoErrorPayload): void {
  if (!isDev || typeof document === "undefined") return;
  console.info("[Home V3 video error]", payload);
}

function logHomeV3VideoDebug(payload: {
  feedCount: number;
  activeIndex: number;
  videoId: string | null;
  hasVideoUrl: boolean;
  playbackUrl: string;
  videoElementExists: boolean;
  videoReadyState: number | null;
  videoNetworkState: number | null;
  videoClientWidth: number | null;
  videoClientHeight: number | null;
  error: string | null;
}): void {
  if (!isDev || typeof document === "undefined") return;
  console.info("[Home V3 video debug]", payload);
}

function logHomeFeedV3Metrics(): void {
  if (!isDev || typeof document === "undefined") return;

  const mainEl = document.querySelector<HTMLElement>(MLV3_HOME_FEED_MAIN_SELECTOR);
  if (!mainEl) return;

  const metrics = applyHomeV3FeedMetrics(mainEl);
  const payload = buildHomeV3FeedMetricsLog(mainEl, metrics);
  if (!payload) return;

  console.info("[Home V3 feed metrics]", {
    cardWidth: payload.cardWidth,
    cardHeight: payload.cardHeight,
    cardRectWidth: payload.cardRectWidth,
    cardRectHeight: payload.cardRectHeight,
    cssWidth: payload.cssWidth,
    cssHeight: payload.cssHeight,
    mockVarWidth: payload.mockVarWidth,
    mockVarHeight: payload.mockVarHeight,
  });
}

/** V3-only clip player — plain video in card (no FeedVideoSurface wrapper layers). */
function HomeFeedV3CardVideo({
  sources,
  feedVideoKey,
  preload,
  fetchPriority,
  videoId,
  processedVideoUrl,
  videoUrl,
  sourceVideoUrl,
  onLoadOk,
  onLoadError,
}: {
  sources: string[];
  feedVideoKey: string;
  preload: "none" | "metadata" | "auto";
  fetchPriority: "high" | "low" | "auto";
  videoId: string | null;
  processedVideoUrl: string | null;
  videoUrl: string | null;
  sourceVideoUrl: string | null;
  onLoadOk: () => void;
  onLoadError: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<PlaybackVideoHandle>(null);
  const {
    isSoundEnabled,
    activeVideoId,
    reportVideoVisibility,
    playbackGeneration,
    feedUserActivationGeneration,
  } = useHomeFeedSound();

  const isActive = activeVideoId === feedVideoKey;
  const muted = !isSoundEnabled || !isActive;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const root =
      el.closest<HTMLElement>("[data-mlv3-home-mock-scroll-root]") ?? null;
    const obs = new IntersectionObserver(
      (entries) => {
        const ratio = entries[0]?.isIntersecting
          ? (entries[0]?.intersectionRatio ?? 0)
          : 0;
        reportVideoVisibility(feedVideoKey, ratio);
      },
      {
        root,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      reportVideoVisibility(feedVideoKey, 0);
    };
  }, [feedVideoKey, reportVideoVisibility]);

  useEffect(() => {
    const h = videoRef.current;
    if (!h) return;
    h.syncAudioOutput(muted, 1);
    if (isActive) {
      void h.play().catch(() => {
        h.syncAudioOutput(true, 1);
        void h.play().catch(() => undefined);
      });
    } else {
      h.pause();
    }
  }, [
    feedUserActivationGeneration,
    isActive,
    muted,
    playbackGeneration,
    sources,
  ]);

  useEffect(() => {
    const onVis = () => {
      const h = videoRef.current;
      if (!h) return;
      if (document.visibilityState === "hidden") {
        h.pause();
        return;
      }
      if (activeVideoId === feedVideoKey) {
        void h.play().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [activeVideoId, feedVideoKey]);

  const logVideoElementError = useCallback(
    (errorKind: string) => {
      const videoEl = wrapRef.current?.querySelector("video") ?? null;
      logHomeV3VideoError({
        videoId,
        processedVideoUrl,
        videoUrl,
        sourceVideoUrl,
        currentUrl: videoEl?.currentSrc || videoEl?.src || null,
        error: errorKind,
        networkState: videoEl?.networkState ?? null,
        readyState: videoEl?.readyState ?? null,
      });
    },
    [processedVideoUrl, sourceVideoUrl, videoId, videoUrl],
  );

  useEffect(() => {
    const videoEl = wrapRef.current?.querySelector("video");
    if (!videoEl) return;

    const onErr = () => {
      logVideoElementError("source_failed");
    };
    videoEl.addEventListener("error", onErr);
    return () => videoEl.removeEventListener("error", onErr);
  }, [logVideoElementError, sources]);

  return (
    <div ref={wrapRef} data-mlv3-home-feed-native-video>
      <PlaybackVideo
        ref={videoRef}
        sources={sources}
        preload={preload}
        fetchPriority={fetchPriority}
        controls={false}
        loop
        autoPlay={false}
        muted={muted}
        volume={1}
        onLoadOk={onLoadOk}
        onLoadError={() => {
          logVideoElementError("all_sources_failed");
          onLoadError();
        }}
        className="block h-full w-full object-cover object-center [color-scheme:dark]"
      />
    </div>
  );
}

type HomeFeedV3CardProps = {
  item: AugmentedHomeFeedItem;
  feedIndex: number;
  activeFeedIndex: number;
  feedCount: number;
};

function HomeFeedV3Card({
  item,
  feedIndex,
  activeFeedIndex,
  feedCount,
}: HomeFeedV3CardProps) {
  const t = useTranslations("homeFeed");
  const { video, profile, userDisplayName, userAvatarUrl, challenge, scoutMetrics } =
    item;
  const playbackSources = useMemo(() => buildV3PlaybackSources(video), [video]);
  const renderedPrimarySrc = playbackSources[0] ?? "";
  const url = renderedPrimarySrc || videoPlaybackUrl(video);
  const feedVideoKey = feedItemVideoKey(item);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasUrl = url.length > 0;
  const hasProcessedAsset = Boolean((video.processed_video_url ?? "").trim());
  const isActiveSlide = feedIndex === activeFeedIndex;

  const slideOffset = feedIndex - activeFeedIndex;
  const videoPreload: "none" | "metadata" | "auto" =
    slideOffset === 0
      ? "auto"
      : slideOffset === -1 || slideOffset === 1
        ? "metadata"
        : "none";
  const videoFetchPriority: "high" | "low" | "auto" =
    slideOffset === 0 ? "high" : "low";

  const userId = (video.user_id ?? "").trim();
  const profilePath = useMemo(
    () => buildPlayerProfilePath(userId, profile?.username),
    [userId, profile?.username],
  );

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    userDisplayName?.trim() ||
    t("unknownPlayer");

  const displayUsername =
    profile?.username?.trim() ||
    profile?.full_name?.trim() ||
    userDisplayName?.trim() ||
    t("unknownPlayer");

  const captionText = video.caption?.trim();

  const shareTrailing =
    video.id ? (
      <VideoRailTrailingActions
        videoId={video.id}
        playerDisplayName={displayName}
        caption={video.caption}
      />
    ) : null;

  useEffect(() => {
    if (!isDev || !isActiveSlide) return;

    const run = () => {
      const card = document.querySelector<HTMLElement>(
        `[data-mlv3-route="home-feed"] [data-mlv3-home-mock-item]:nth-child(${feedIndex + 1}) [data-mlv3-home-mock-card]`,
      );
      const videoEl = card?.querySelector("video") ?? null;
      logHomeV3VideoDebug({
        feedCount,
        activeIndex: activeFeedIndex,
        videoId: video.id ?? feedVideoKey,
        hasVideoUrl: hasUrl,
        playbackUrl: renderedPrimarySrc || url,
        videoElementExists: Boolean(videoEl),
        videoReadyState: videoEl?.readyState ?? null,
        videoNetworkState: videoEl?.networkState ?? null,
        videoClientWidth: videoEl ? Math.round(videoEl.clientWidth) : null,
        videoClientHeight: videoEl ? Math.round(videoEl.clientHeight) : null,
        error: loadError,
      });
    };

    run();
    const id = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(id);
  }, [
    activeFeedIndex,
    feedCount,
    feedIndex,
    feedVideoKey,
    hasUrl,
    isActiveSlide,
    loadError,
    renderedPrimarySrc,
    url,
    video.id,
  ]);

  return (
    <HomeFeedCardFrameV3>
      <div data-mlv3-home-feed-video>
        {challenge ? (
          <div data-mlv3-home-feed-challenge>
            <ChallengeTagPill
              routeSegment={challengeLinkSegment(challenge)}
              displayTitle={challengeDisplayTitle(challenge)}
              className="shadow-md ring-1 ring-black/30 backdrop-blur-md"
            />
          </div>
        ) : null}

        {hasUrl ? (
          <HomeFeedV3CardVideo
            sources={playbackSources}
            feedVideoKey={feedVideoKey}
            preload={videoPreload}
            fetchPriority={videoFetchPriority}
            videoId={video.id ?? null}
            processedVideoUrl={(video.processed_video_url ?? "").trim() || null}
            videoUrl={(video.video_url ?? "").trim() || null}
            sourceVideoUrl={(video.source_video_url ?? "").trim() || null}
            onLoadOk={() => {
              setLoadFailed(false);
              setLoadError(null);
            }}
            onLoadError={() => {
              setLoadFailed(true);
              setLoadError("all_sources_failed");
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-white/45">
            {t("noVideoUrl")}
          </div>
        )}

        <div
          data-mlv3-home-feed-vignette
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/50"
          aria-hidden
        />
        <div
          data-mlv3-home-feed-vignette
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black/55 via-transparent to-transparent"
          aria-hidden
        />
      </div>

      <div data-mlv3-home-feed-rail>
        <FeedVideoEngagement
          videoId={video.id}
          initialLikeCount={scoutMetrics?.likesCount ?? null}
          initialCommentCount={scoutMetrics?.commentsCount ?? null}
          variant="rail"
          trailingActions={shareTrailing}
          railSoundSlot={
            hasUrl ? <FeedSoundRailButton feedVideoKey={feedVideoKey} /> : null
          }
        />
      </div>

      <div data-mlv3-home-feed-meta>
        {loadFailed && hasUrl ? (
          <p
            className="pointer-events-auto mb-1 text-[10px] font-medium text-gn-accent"
            role="alert"
          >
            {t("videoLoadFailed")}
          </p>
        ) : null}

        <div className="pointer-events-auto flex min-w-0 items-center gap-1.5">
          {profilePath ? (
            <Link
              href={profilePath}
              className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/30"
              aria-label={t("viewPlayerProfileAria", { name: displayName })}
            >
              <ProfileAvatar
                name={displayName}
                imageUrl={userAvatarUrl?.trim() || undefined}
                sizeClassName="h-7 w-7 shrink-0 text-[10px] font-semibold"
                className="overflow-hidden rounded-full ring-0"
              />
            </Link>
          ) : (
            <ProfileAvatar
              name={displayName}
              imageUrl={userAvatarUrl?.trim() || undefined}
              sizeClassName="h-7 w-7 shrink-0 text-[10px] font-semibold"
              className="overflow-hidden rounded-full ring-1 ring-white/30"
            />
          )}

          <div className="min-w-0 flex-1">
            {profilePath ? (
              <Link
                href={profilePath}
                className="block min-w-0"
                aria-label={t("viewPlayerProfileAria", { name: displayName })}
              >
                <p className="mlv3-feed-meta-name text-[13px] font-semibold text-white">
                  {displayName}
                </p>
                <p className="mlv3-feed-meta-name text-[11px] text-white/75">
                  @{displayUsername}
                </p>
              </Link>
            ) : (
              <>
                <p className="mlv3-feed-meta-name text-[13px] font-semibold text-white">
                  {displayName}
                </p>
                <p className="mlv3-feed-meta-name text-[11px] text-white/75">
                  @{displayUsername}
                </p>
              </>
            )}
          </div>
        </div>

        {captionText ? (
          <p className="mlv3-feed-meta-caption mt-1 text-[12px] leading-snug text-white/88">
            {captionText}
          </p>
        ) : null}

        {item.musicTrack && hasProcessedAsset ? (
          <VideoMusicCredit
            track={item.musicTrack}
            compact
            className="pointer-events-auto !text-[10px] !leading-snug text-white/55"
          />
        ) : null}
      </div>
    </HomeFeedCardFrameV3>
  );
}

function HomeFeedV3Scroll({
  items,
  onNearEnd,
}: {
  items: AugmentedHomeFeedItem[];
  onNearEnd: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { activeVideoId, notifyFeedUserActivation, reportScrollSnapBoost } =
    useHomeFeedSound();

  useMobileShellV3HomeFeedMetrics(true, items.length);

  const syncFeedMetrics = useCallback((mainEl: HTMLElement | null) => {
    if (!mainEl) return null;
    const metrics = applyHomeV3FeedMetrics(mainEl);
    resetHomeMockV3HorizontalScroll();
    return metrics;
  }, []);

  const bindScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (!node) return;
    const mainEl = node.closest<HTMLElement>(MLV3_HOME_FEED_MAIN_SELECTOR);
    syncFeedMetrics(mainEl);
    window.requestAnimationFrame(() => {
      syncFeedMetrics(mainEl);
      logHomeFeedV3Metrics();
      logHomeV3FrameCompare("home-feed", activeFeedIndex);
    });
  }, [syncFeedMetrics]);

  const activeFeedIndex = useMemo(() => {
    if (!activeVideoId) return activeIndex;
    const i = items.findIndex((it) => feedItemVideoKey(it) === activeVideoId);
    return i >= 0 ? i : activeIndex;
  }, [activeVideoId, activeIndex, items]);

  const snapVideoKeys = useMemo(
    () => items.map((item) => feedItemVideoKey(item)),
    [items],
  );

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

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h <= 0) return;
    const index = Math.max(
      0,
      Math.min(items.length - 1, Math.round(el.scrollTop / h)),
    );
    setActiveIndex(index);
    const key = snapVideoKeys[index];
    if (key) reportScrollSnapBoost(key);
  }, [items.length, reportScrollSnapBoost, snapVideoKeys]);

  useLayoutEffect(() => {
    const mainEl = document.querySelector<HTMLElement>(MLV3_HOME_FEED_MAIN_SELECTOR);
    syncFeedMetrics(mainEl);
    const id = window.requestAnimationFrame(() => {
      syncFeedMetrics(mainEl);
      logHomeFeedV3Metrics();
      logHomeV3FrameCompare("home-feed", activeFeedIndex);
      if (isDev) {
        logHomeV3VideoDebug({
          feedCount: items.length,
          activeIndex: activeFeedIndex,
          videoId: snapVideoKeys[activeFeedIndex] ?? null,
          hasVideoUrl: Boolean(snapVideoKeys[activeFeedIndex]),
          playbackUrl: "",
          videoElementExists: Boolean(
            document.querySelector('[data-mlv3-route="home-feed"] video'),
          ),
          videoReadyState: null,
          videoNetworkState: null,
          videoClientWidth: null,
          videoClientHeight: null,
          error: null,
        });
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeFeedIndex, items.length, snapVideoKeys, syncFeedMetrics]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const unlock = () => {
      notifyFeedUserActivation();
    };

    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
      updateActiveIndex();

      const nearEnd =
        el.scrollHeight - el.scrollTop - el.clientHeight <
        el.clientHeight * 0.65;
      if (nearEnd) {
        onNearEnd();
      }
    };

    el.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    el.addEventListener("touchstart", unlock, { capture: true, passive: true });
    el.addEventListener("wheel", unlock, { capture: true, passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });
    updateActiveIndex();
    return () => {
      el.removeEventListener("pointerdown", unlock, { capture: true });
      el.removeEventListener("touchstart", unlock, { capture: true });
      el.removeEventListener("wheel", unlock, { capture: true });
      el.removeEventListener("scroll", onScroll);
    };
  }, [notifyFeedUserActivation, onNearEnd, updateActiveIndex]);

  return (
    <>
      <FeedVideoHeadPreloads firstHref={firstPreloadHref} nextHref={nextPreloadHref} />
      <HomeFeedV3SnapShell scrollRef={bindScrollRef} ariaLabel="Home feed V3">
        <HomeFeedV3SnapItems>
          {items.map((item, index) => (
            <HomeFeedV3SnapItem
              key={
                item.video.id ??
                `${item.video.user_id}-${item.video.created_at ?? ""}-${index}`
              }
            >
              <HomeFeedV3ItemStage>
                <HomeFeedV3Card
                  item={item}
                  feedIndex={index}
                  activeFeedIndex={activeFeedIndex}
                  feedCount={items.length}
                />
              </HomeFeedV3ItemStage>
            </HomeFeedV3SnapItem>
          ))}
        </HomeFeedV3SnapItems>
      </HomeFeedV3SnapShell>
    </>
  );
}

function HomeFeedV3Loaded() {
  const tFeed = useTranslations("homeFeed");
  const locale = useLocale();
  const pathname = usePathname();
  const onFeedRoute = isMobileLayoutV3HomeFeedRoute(pathname);
  const loadMoreInFlightRef = useRef(false);
  const loadRunRef = useRef(0);

  const [items, setItems] = useState<AugmentedHomeFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoadFailed, setFeedLoadFailed] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const runInitialLoad = useCallback(async () => {
    const runId = ++loadRunRef.current;
    setLoading(true);
    setFeedLoadFailed(false);
    setLoadErrorMessage(null);

    try {
      const { items: next, error } = await fetchHomeFeedV3Initial(locale);
      if (loadRunRef.current !== runId) return;

      if (error) {
        setFeedLoadFailed(true);
        setLoadErrorMessage(error);
        setItems([]);
        setHasMore(false);
        return;
      }

      setFeedLoadFailed(false);
      setLoadErrorMessage(null);
      setItems(next);
      setHasMore(next.length >= HOME_FEED_PAGE_SIZE);
    } finally {
      if (loadRunRef.current === runId) {
        setLoading(false);
      }
    }
  }, [locale]);

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
          "[PitchRusch home feed v3] load more failed",
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
      logFullSupabaseError("[PitchRusch home feed v3] load more unexpected", e);
    } finally {
      setLoadingMore(false);
      loadMoreInFlightRef.current = false;
    }
  }, [feedLoadFailed, hasMore, items.length, loading, loadingMore]);

  useEffect(() => {
    if (!onFeedRoute) return;
    void runInitialLoad();
    return () => {
      loadRunRef.current += 1;
    };
  }, [onFeedRoute, runInitialLoad]);

  if (loading) {
    return (
      <div data-mlv3-home-feed-status className="text-sm text-gn-text-secondary">
        {tFeed("loadingFeed")}
      </div>
    );
  }

  if (feedLoadFailed) {
    return (
      <div data-mlv3-home-feed-status className="space-y-3 text-sm">
        <p className="font-medium text-gn-text" role="alert">
          {loadErrorMessage ?? tFeed("errorTitle")}
        </p>
        {loadErrorMessage !== FEED_TIMEOUT_MESSAGE ? (
          <p className="text-gn-text-secondary">{tFeed("errorBody")}</p>
        ) : null}
        <button
          type="button"
          className="rounded-lg border border-gn-accent/40 bg-gn-accent/10 px-4 py-2 text-sm font-medium text-gn-text"
          onClick={() => void runInitialLoad()}
        >
          {tFeed("retry")}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div data-mlv3-home-feed-status className="space-y-2 text-sm">
        <p className="font-medium text-gn-text">{tFeed("empty")}</p>
        <p className="text-gn-text-secondary">{tFeed("emptySubtitle")}</p>
      </div>
    );
  }

  const bootstrapActiveVideoId = feedItemVideoKey(items[0]) ?? null;

  return (
    <HomeFeedSoundProvider bootstrapActiveVideoId={bootstrapActiveVideoId}>
      <HomeFeedV3Scroll items={items} onNearEnd={() => void handleLoadMore()} />
    </HomeFeedSoundProvider>
  );
}

export function HomeFeedV3() {
  const pathname = usePathname();
  const enabled = isMobileLayoutV3Enabled();
  const onFeedRoute = isMobileLayoutV3HomeFeedRoute(pathname);

  if (!enabled) {
    return (
      <div className="space-y-4 py-6 text-sm text-gn-text-secondary">
        <h1 className="text-lg font-semibold text-gn-text">Home V3 feed</h1>
        <p>
          Flag is <strong className="text-gn-text">off</strong>. Add to{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 text-gn-text">.env.local</code>:
        </p>
        <pre className="overflow-x-auto rounded-lg border border-gn-border-subtle bg-black/30 p-3 text-xs text-gn-text">
          NEXT_PUBLIC_MOBILE_LAYOUT_V3=true
        </pre>
      </div>
    );
  }

  if (!onFeedRoute) {
    return (
      <p className="py-6 text-sm text-gn-text-secondary">
        Open{" "}
        <Link
          href="/debug/mobile-layout-v3/home-feed"
          className="text-gn-accent underline"
        >
          /debug/mobile-layout-v3/home-feed
        </Link>
      </p>
    );
  }

  return <HomeFeedV3Loaded />;
}
