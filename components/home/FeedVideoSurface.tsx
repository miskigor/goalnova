"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useTranslations } from "next-intl";
import { devLog, isDev } from "@/lib/devLog";
import {
  PlaybackVideo,
  type PlaybackVideoHandle,
} from "@/components/video/PlaybackVideo";
import {
  HOME_FEED_ACTIVE_CLIP_RATIO_MIN,
  useHomeFeedSound,
} from "@/components/home/HomeFeedSoundContext";
import {
  GN_VIDEO_MEDIA_ELEMENT_CLASS,
  GN_VIDEO_MEDIA_STAGE_FLEX_CLASS,
  gnVideoMediaDataProps,
} from "@/lib/video/videoMediaDisplayClasses";
import {
  homeFeedIntersectionRootMargin,
  resolveHomeFeedIntersectionRoot,
} from "@/lib/feed/homeFeedIntersectionRoot";
import { isHomeFeedMobileViewport } from "@/components/home/homeFeedMobileScrollReset";

type Props = {
  sources: string[];
  /** First URL tried by the player (see `homeFeedPlaybackCandidates` order). */
  renderedPrimarySrc: string;
  videoId: string;
  className?: string;
  /** Home immersive slides: letterbox inside the card; dashboard embed keeps cover. */
  mediaFit?: "cover" | "contain";
  /** Letterbox alignment when `mediaFit` is `contain` (mobile home: top). */
  mediaObjectPosition?: "center" | "top";
  preload?: "none" | "metadata" | "auto";
  /** Prefer network / decode for the visible or first slide. */
  fetchPriority?: "high" | "low" | "auto";
  onLoadOk?: () => void;
  onLoadError?: () => void;
  /** Dev-only diagnostics for the home feed active clip. */
  debugMeta?: {
    videoRowId: string | null;
    source_video_url: string | null;
    processed_video_url: string | null;
    video_url: string | null;
  };
  /** Observe visibility on a larger node (e.g. full clean-home slide). Defaults to media wrap. */
  visibilityObserveRef?: RefObject<Element | null>;
  /** Still frame while the clip buffers. */
  poster?: string;
  /** Timeout before trying the next playback URL (feed uses a shorter watchdog). */
  loadWatchdogMs?: number;
};

/**
 * TikTok-style feed clip: autoplay while visible; global sound from context;
 * only the active (most visible) item may play unmuted. Handles muted autoplay
 * fallback when the browser blocks unmuted play until user uses the sound control.
 *
 * **Active clip lifecycle (must match `HTMLVideoElement`, not only React/icon state):**
 * 1. Visibility → `activeVideoId` (IntersectionObserver + context).
 * 2. `useLayoutEffect` → `applyVideoElementAudio()` (inactive = muted + pause; active = global sound + policy).
 * 3. `loadeddata` → `onMediaLoaded` → `applyVideoElementAudio()` again (media attached after mount).
 * 4. `executePlay()` → `applyVideoElementAudio()` then `play()`; `onCanPlay` repeats (3)+(4) for slow loads.
 */
export function FeedVideoSurface({
  sources,
  renderedPrimarySrc,
  videoId,
  className,
  mediaFit = "contain",
  mediaObjectPosition = "center",
  preload = "metadata",
  fetchPriority = "auto",
  onLoadOk,
  onLoadError,
  debugMeta,
  visibilityObserveRef,
  poster,
  loadWatchdogMs,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<PlaybackVideoHandle | null>(null);
  const executePlayRef = useRef<(() => void) | null>(null);
  const tFeed = useTranslations("homeFeed");
  const {
    isSoundEnabled,
    activeVideoId,
    reportVideoVisibility,
    playbackGeneration,
    feedUserActivationGeneration,
    requestPlaybackRetry,
    notifyFeedUserActivation,
  } = useHomeFeedSound();
  const lastPlaybackGenerationRef = useRef(playbackGeneration);
  const lastFeedActivationGenRef = useRef(feedUserActivationGeneration);
  const isActiveRef = useRef(false);
  const isSoundEnabledRef = useRef(isSoundEnabled);
  /** Poništava zakasnjele pokušaje uključivanja zvuka pri promjeni klipa. */
  const audibleRetryGenerationRef = useRef(0);
  const lastAudiblePromoteAtRef = useRef(0);

  const [browserPolicyMuted, setBrowserPolicyMuted] = useState(false);
  /** Hidden until first `playing` — avoids empty black frame while buffering. */
  const [mediaReady, setMediaReady] = useState(false);
  /** Browser blocked programmatic play — offer tap-to-play (still respects mute policy below). */
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);

  const isActive = activeVideoId === videoId;
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    setMediaReady(false);
    setNeedsTapToPlay(false);
  }, [renderedPrimarySrc]);

  useEffect(() => {
    if (!isActive) setNeedsTapToPlay(false);
  }, [isActive]);

  /** Sound off or not the focused slide → output muted; browser may also force mute. */
  const effectiveMuted = !isSoundEnabled || !isActive;
  const outputMuted = effectiveMuted || browserPolicyMuted;

  /**
   * Single source of truth for the underlying `HTMLVideoElement` audio flags.
   * Call after activation, after media loads, and immediately before `play()`.
   */
  const applyVideoElementAudio = useCallback(() => {
    const h = videoRef.current;
    if (!h?.syncAudioOutput) return;
    if (!isActive) {
      h.syncAudioOutput(true, 1);
      return;
    }
    h.syncAudioOutput(outputMuted, 1);
  }, [isActive, outputMuted]);

  /**
   * Nakon što je muted autoplay već krenuo, preglednik često dopusti `muted=false` + play()
   * u sljedećim tickovima — zato glazba može kasniti ako ovo ne pokušamo odmah.
   */
  const tryPromoteToAudible = useCallback(() => {
    if (!isSoundEnabledRef.current || !isActiveRef.current) return;
    const h = videoRef.current;
    if (!h?.syncAudioOutput) return;
    const st = h.getVideoState?.();
    if (!st?.muted) return;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastAudiblePromoteAtRef.current < 60) return;
    lastAudiblePromoteAtRef.current = now;

    setBrowserPolicyMuted(false);
    h.syncAudioOutput(false, 1);
    void h.play().catch(() => {
      setBrowserPolicyMuted(true);
    });
  }, []);

  const scheduleAudiblePromotion = useCallback(() => {
    if (!isSoundEnabledRef.current || !isActiveRef.current) return;
    const gen = ++audibleRetryGenerationRef.current;
    const delays = [0, 90, 220, 450];
    for (const ms of delays) {
      window.setTimeout(() => {
        if (audibleRetryGenerationRef.current !== gen) return;
        if (!isActiveRef.current || !isSoundEnabledRef.current) return;
        if (!videoRef.current?.getVideoState?.().muted) return;
        tryPromoteToAudible();
      }, ms);
    }
  }, [tryPromoteToAudible]);

  const logActiveClip = useCallback(
    (reason: "playing" | "state") => {
      if (!isActive) return;
      const st = videoRef.current?.getVideoState?.();
      devLog("[PitchRusch][FeedVideoSurface] active clip", {
        reason,
        feedVideoId: videoId,
        isSoundEnabled,
        browserPolicyMuted,
        intendedMuted: outputMuted,
        videoRowId: debugMeta?.videoRowId ?? null,
        source_video_url: debugMeta?.source_video_url ?? null,
        processed_video_url: debugMeta?.processed_video_url ?? null,
        video_url: debugMeta?.video_url ?? null,
        renderedPrimarySrc,
        actualSrc: st?.currentSrc ?? renderedPrimarySrc,
        mutedProp: outputMuted,
        actualMuted: st?.muted ?? null,
        actualVolume: st?.volume ?? null,
      });
    },
    [
      debugMeta?.processed_video_url,
      debugMeta?.source_video_url,
      debugMeta?.videoRowId,
      debugMeta?.video_url,
      browserPolicyMuted,
      isActive,
      isSoundEnabled,
      outputMuted,
      renderedPrimarySrc,
      videoId,
    ],
  );

  useEffect(() => {
    devLog("[PitchRusch][FeedVideoSurface] feed player", {
      videoId,
      videoSrc: renderedPrimarySrc,
      muted: outputMuted,
      isActive,
      isSoundEnabled,
      browserPolicyMuted,
    });
    if (isActive) logActiveClip("state");
  }, [
    videoId,
    renderedPrimarySrc,
    outputMuted,
    isActive,
    isSoundEnabled,
    browserPolicyMuted,
    logActiveClip,
  ]);

  useLayoutEffect(() => {
    const el =
      visibilityObserveRef?.current ??
      wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let obs: IntersectionObserver | null = null;

    const attach = () => {
      obs?.disconnect();
      const root =
        el instanceof HTMLElement ? resolveHomeFeedIntersectionRoot(el) : null;

      obs = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          if (!e) return;
          const ratio = e.isIntersecting ? e.intersectionRatio : 0;
          if (isDev) {
            const lo = Math.max(0, HOME_FEED_ACTIVE_CLIP_RATIO_MIN - 0.08);
            if (ratio === 0 || ratio >= lo) {
              devLog("[PitchRusch][FeedVideoSurface][IO]", {
                feedVideoId: videoId,
                intersectionRatio: ratio,
                scrollRootFound: Boolean(root),
                desktopViewport: !isHomeFeedMobileViewport(),
              });
            }
          }
          reportVideoVisibility(videoId, ratio);
        },
        {
          root,
          rootMargin: homeFeedIntersectionRootMargin(),
          threshold: [
            0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6,
            0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1,
          ],
        },
      );

      obs.observe(el);
    };

    attach();
    window.addEventListener("resize", attach, { passive: true });

    return () => {
      window.removeEventListener("resize", attach);
      obs?.disconnect();
      reportVideoVisibility(videoId, 0);
    };
  }, [reportVideoVisibility, videoId, visibilityObserveRef]);

  /**
   * Whenever this row becomes active/inactive or sound/policy changes, sync the real element
   * in the same frame as DOM updates (before `useEffect` + `play()`).
   */
  useLayoutEffect(() => {
    const h = videoRef.current;
    if (!h?.syncAudioOutput) return;
    if (!isActive) {
      applyVideoElementAudio();
      h.pause();
      return;
    }
    applyVideoElementAudio();
  }, [
    activeVideoId,
    applyVideoElementAudio,
    isActive,
    isSoundEnabled,
    outputMuted,
    videoId,
  ]);

  const executePlay = useCallback(() => {
    const h = videoRef.current;
    if (!h?.syncAudioOutput || !isActive) return;

    applyVideoElementAudio();
    const before = h.getVideoState?.();

    devLog("[PitchRusch][FeedVideoSurface] play attempt", {
      activeVideoId,
      feedVideoId: videoId,
      isSoundEnabled,
      browserPolicyMuted,
      intendedMuted: outputMuted,
      actualMutedBeforePlay: before?.muted,
      actualVolumeBeforePlay: before?.volume,
      playAfterIntendedUnmute: !outputMuted,
    });

    const p = h.play();
    if (!p) return;

    void p
      .then(() => {
        const after = h.getVideoState?.();
        devLog("[PitchRusch][FeedVideoSurface] play() resolved", {
          feedVideoId: videoId,
          isSoundEnabled,
          intendedMuted: outputMuted,
          actualMutedAfterPlay: after?.muted,
          actualVolumeAfterPlay: after?.volume,
        });
        if (!outputMuted) setBrowserPolicyMuted(false);
        if (isSoundEnabled && isActive && after?.muted) {
          scheduleAudiblePromotion();
        }
      })
      .catch((err) => {
        const after = h.getVideoState?.();
        devLog("[PitchRusch][FeedVideoSurface] play() rejected", {
          feedVideoId: videoId,
          isSoundEnabled,
          intendedMuted: outputMuted,
          actualMutedAfterReject: after?.muted,
          err,
        });
        if (isSoundEnabled && isActive) setBrowserPolicyMuted(true);
        const blocked =
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name?: string }).name === "NotAllowedError";
        if (isActive && blocked) setNeedsTapToPlay(true);
      });
  }, [
    activeVideoId,
    applyVideoElementAudio,
    browserPolicyMuted,
    isActive,
    isSoundEnabled,
    outputMuted,
    scheduleAudiblePromotion,
    videoId,
  ]);

  /** Pause when user switches tab / backgrounds the app; resume when visible if still active. */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        videoRef.current?.pause();
        return;
      }
      if (isActiveRef.current) {
        queueMicrotask(() => executePlayRef.current?.());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useLayoutEffect(() => {
    executePlayRef.current = executePlay;
  }, [executePlay]);

  /**
   * Uvijek pozovi play() kad je klip aktivan. Prije je `return` nakon `setBrowserPolicyMuted(false)`
   * preskakao play() kad React nije radio re-render (state već false) — video se nikad nije pokrenuo.
   */
  useEffect(() => {
    if (!isActive) {
      audibleRetryGenerationRef.current += 1;
      setBrowserPolicyMuted(false);
      videoRef.current?.pause();
      return;
    }

    if (lastPlaybackGenerationRef.current !== playbackGeneration) {
      lastPlaybackGenerationRef.current = playbackGeneration;
      setBrowserPolicyMuted(false);
    }
    if (lastFeedActivationGenRef.current !== feedUserActivationGeneration) {
      lastFeedActivationGenRef.current = feedUserActivationGeneration;
      if (feedUserActivationGeneration > 0) {
        setBrowserPolicyMuted(false);
      }
    }

    executePlay();
  }, [
    executePlay,
    feedUserActivationGeneration,
    isActive,
    outputMuted,
    playbackGeneration,
    renderedPrimarySrc,
    videoId,
  ]);

  const onMediaLoaded = useCallback(() => {
    applyVideoElementAudio();
    onLoadOk?.();
    queueMicrotask(() => {
      if (isActiveRef.current) executePlay();
    });
  }, [applyVideoElementAudio, executePlay, onLoadOk]);

  const handleTapToResume = useCallback(() => {
    notifyFeedUserActivation(true);
    requestPlaybackRetry();
    setNeedsTapToPlay(false);
    queueMicrotask(() => executePlay());
  }, [executePlay, notifyFeedUserActivation, requestPlaybackRetry]);

  const containMedia = mediaFit !== "cover";
  const mediaStageClass = containMedia
    ? `pointer-events-none absolute inset-0 z-[2] ${GN_VIDEO_MEDIA_STAGE_FLEX_CLASS}`
    : "pointer-events-none absolute inset-0 z-[2]";
  const objectPositionClass =
    containMedia && mediaObjectPosition === "top"
      ? "object-top"
      : "object-center";
  const defaultVideoClass = containMedia
    ? `${GN_VIDEO_MEDIA_ELEMENT_CLASS} ${objectPositionClass}`
    : "h-full w-full max-w-full object-cover [color-scheme:dark]";
  const videoClassName = [className ?? defaultVideoClass, "pointer-events-none"]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      {...gnVideoMediaDataProps}
      className={`absolute inset-0 max-w-full overflow-hidden bg-black`}
    >
      {/* Backdrop so inactive / buffering slides are never flat pure black */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-neutral-950 via-black to-neutral-950"
        aria-hidden
      />
      <div ref={wrapRef} className={mediaStageClass}>
        <PlaybackVideo
          ref={videoRef}
          sources={sources}
          preload={preload}
          fetchPriority={fetchPriority}
          controls={false}
          loop
          autoPlay
          muted={outputMuted}
          volume={1}
          onCanPlay={() => {
            applyVideoElementAudio();
            if (isActiveRef.current) executePlay();
          }}
          onCanPlayThrough={() => {
            applyVideoElementAudio();
            if (isActiveRef.current) executePlay();
          }}
          onPlaying={() => {
            setMediaReady(true);
            setNeedsTapToPlay(false);
            logActiveClip("playing");
            if (isSoundEnabledRef.current && isActiveRef.current) {
              if (videoRef.current?.getVideoState?.().muted) {
                scheduleAudiblePromotion();
              }
            }
          }}
          onLoadOk={onMediaLoaded}
          onLoadError={onLoadError}
          poster={poster}
          loadWatchdogMs={loadWatchdogMs}
          className={videoClassName}
        />
      </div>

      {isActive && !mediaReady && renderedPrimarySrc && !poster ? (
        <div
          className="pointer-events-none absolute inset-0 z-[18] flex flex-col items-center justify-center bg-gradient-to-b from-black/80 via-black/55 to-black/85"
          aria-busy
          aria-label={tFeed("videoBufferingAria")}
        >
          <div className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <svg
              className="size-7 text-white/85"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
          <div className="mt-4 h-1 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-orange-500 to-orange-400" />
          </div>
        </div>
      ) : null}

      {needsTapToPlay && isActive ? (
        <div className="absolute inset-0 z-[25] flex items-center justify-center bg-black/35 p-6">
          <button
            type="button"
            className="pointer-events-auto flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-2 rounded-full border border-white/25 bg-black/55 px-8 py-4 text-sm font-semibold text-white shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-md transition hover:bg-black/65 active:scale-[0.98]"
            onClick={handleTapToResume}
          >
            <svg className="size-10 text-orange-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
            <span className="max-w-[12rem] text-center leading-snug">{tFeed("tapToPlay")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
