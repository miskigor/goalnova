"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { devLog } from "@/lib/devLog";
import {
  PlaybackVideo,
  type PlaybackVideoHandle,
} from "@/components/video/PlaybackVideo";
import { useHomeFeedSound } from "@/components/home/HomeFeedSoundContext";

type Props = {
  sources: string[];
  /** First URL tried by the player (matches processed → source → primary). */
  renderedPrimarySrc: string;
  videoId: string;
  className?: string;
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
  preload = "metadata",
  fetchPriority = "auto",
  onLoadOk,
  onLoadError,
  debugMeta,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<PlaybackVideoHandle | null>(null);
  const {
    isSoundEnabled,
    activeVideoId,
    reportVideoVisibility,
    playbackGeneration,
    feedUserActivationGeneration,
  } = useHomeFeedSound();
  const lastPlaybackGenerationRef = useRef(playbackGeneration);
  const lastFeedActivationGenRef = useRef(feedUserActivationGeneration);
  const isActiveRef = useRef(false);
  const isSoundEnabledRef = useRef(isSoundEnabled);
  /** Poništava zakasnjele pokušaje uključivanja zvuka pri promjeni klipa. */
  const audibleRetryGenerationRef = useRef(0);
  const lastAudiblePromoteAtRef = useRef(0);

  const [browserPolicyMuted, setBrowserPolicyMuted] = useState(false);

  const isActive = activeVideoId === videoId;
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);
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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const root =
      el.closest<HTMLElement>("[data-pitchrusch-feed-scroll-root]") ?? null;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        reportVideoVisibility(
          videoId,
          e.isIntersecting ? e.intersectionRatio : 0,
        );
      },
      {
        root,
        /** Bottom inset: next snap page starts competing for “active” earlier while scrolling. */
        rootMargin: "0px 0px 28% 0px",
        /** Dense steps so active clip switches quickly during snap scroll (not only at 25% / 50%). */
        threshold: [
          0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6,
          0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1,
        ],
      },
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
      reportVideoVisibility(videoId, 0);
    };
  }, [reportVideoVisibility, videoId]);

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
      });
  }, [
    applyVideoElementAudio,
    browserPolicyMuted,
    isActive,
    isSoundEnabled,
    outputMuted,
    scheduleAudiblePromotion,
    videoId,
  ]);

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

  return (
    <div className="absolute inset-0">
      <div ref={wrapRef} className="pointer-events-none absolute inset-0">
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
          onPlaying={() => {
            logActiveClip("playing");
            if (isSoundEnabledRef.current && isActiveRef.current) {
              if (videoRef.current?.getVideoState?.().muted) {
                scheduleAudiblePromotion();
              }
            }
          }}
          onLoadOk={onMediaLoaded}
          onLoadError={onLoadError}
          className={[className, "pointer-events-none"].filter(Boolean).join(" ")}
        />
      </div>
    </div>
  );
}
