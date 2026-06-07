"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";

export type PlaybackVideoHandle = {
  play: () => Promise<void>;
  pause: () => void;
  /** Apply directly on the element so feed audio matches intent before play() (avoids prop/effect lag). */
  syncAudioOutput: (muted: boolean, volume: number) => void;
  getVideoState: () => {
    muted: boolean;
    volume: number;
    currentSrc: string;
  };
};

type PlaybackVideoProps = {
  sources: string[];
  className?: string;
  preload?: "none" | "metadata" | "auto";
  onLoadOk?: () => void;
  onLoadError?: () => void;
  /** Default true; set false for immersive feed-style playback. */
  controls?: boolean;
  loop?: boolean;
  /** Feed-style autoplay hint (browser may still gate). */
  autoPlay?: boolean;
  /** Often required for autoplay in feed contexts. */
  muted?: boolean;
  /** 0–1; default 1. */
  volume?: number;
  /** Fires when enough data is available to start (retry play() after load). */
  onCanPlay?: () => void;
  /** Enough buffered to play through without stalling (mobile feed: retry play). */
  onCanPlayThrough?: () => void;
  /** Fires when playback actually starts (good for debug / metrics). */
  onPlaying?: () => void;
  /** Hint for the browser when competing for network (feed active clip). */
  fetchPriority?: "high" | "low" | "auto";
  /** Still frame while the clip buffers (feed return / cold start). */
  poster?: string;
};

export const PlaybackVideo = forwardRef<PlaybackVideoHandle | null, PlaybackVideoProps>(
  function PlaybackVideo(
    {
      sources,
      className,
      preload = "metadata",
      onLoadOk,
      onLoadError,
      controls = true,
      loop = false,
      autoPlay = false,
      muted = false,
      volume = 1,
      onCanPlay,
      onCanPlayThrough,
      onPlaying,
      fetchPriority,
      poster,
    },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const loadWatchdogRef = useRef<number | null>(null);
    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      v.volume = Math.min(1, Math.max(0, volume));
    }, [volume]);
    const uniqueSources = useMemo(
      () => Array.from(new Set(sources.map((s) => s.trim()).filter(Boolean))),
      [sources],
    );
    const [sourceIndex, setSourceIndex] = useState(0);
    const currentSrc = uniqueSources[sourceIndex] ?? "";
    const canFallback = sourceIndex + 1 < uniqueSources.length;

    const clearLoadWatchdog = useCallback(() => {
      if (loadWatchdogRef.current !== null) {
        window.clearTimeout(loadWatchdogRef.current);
        loadWatchdogRef.current = null;
      }
    }, []);

    const advanceToNextSource = useCallback(() => {
      clearLoadWatchdog();
      setSourceIndex((idx) => idx + 1);
    }, [clearLoadWatchdog]);

    useIosInlineVideoFirstFrameBump(videoRef, Boolean(currentSrc), currentSrc);

    useEffect(() => {
      setSourceIndex(0);
    }, [uniqueSources]);

    useEffect(() => {
      clearLoadWatchdog();
      if (!currentSrc || !canFallback) return;

      // Some URLs never emit `error` but also never reach `loadeddata`. Do not use `waiting`/`stalled`
      // for fallback — those fire during normal re-buffering and swapping `src` feels like start–stop–start.
      const LOAD_WATCHDOG_MS = 10_000;
      loadWatchdogRef.current = window.setTimeout(() => {
        advanceToNextSource();
      }, LOAD_WATCHDOG_MS);

      return () => {
        clearLoadWatchdog();
      };
    }, [advanceToNextSource, canFallback, clearLoadWatchdog, currentSrc]);

    useEffect(() => {
      const v = videoRef.current;
      if (!v || !currentSrc) return;
      v.setAttribute("webkit-playsinline", "");
      v.setAttribute("playsinline", "");
    }, [currentSrc]);

    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          const v = videoRef.current;
          if (!v) return Promise.resolve();
          // Nudge fetch when the element has not left HAVE_NOTHING (common with preload="none" neighbors).
          if (v.readyState < HTMLMediaElement.HAVE_METADATA) {
            try {
              v.load();
            } catch {
              /* ignore */
            }
          }
          return v.play() ?? Promise.resolve();
        },
        pause: () => videoRef.current?.pause(),
        syncAudioOutput: (muted: boolean, volume: number) => {
          const v = videoRef.current;
          if (!v) return;
          v.muted = muted;
          v.volume = Math.min(1, Math.max(0, volume));
        },
        getVideoState: () => {
          const v = videoRef.current;
          return {
            muted: v?.muted ?? true,
            volume: v?.volume ?? 1,
            currentSrc: v?.currentSrc ?? "",
          };
        },
      }),
      [],
    );

    if (!currentSrc) return null;

    return (
      <video
        ref={videoRef}
        className={className}
        controls={controls}
        playsInline
        preload={preload}
        tabIndex={-1}
        src={currentSrc}
        loop={loop}
        autoPlay={autoPlay}
        muted={muted}
        poster={poster}
        {...(fetchPriority ? { fetchPriority } : {})}
        onLoadedData={() => {
          clearLoadWatchdog();
          onLoadOk?.();
        }}
        onCanPlay={() => {
          onCanPlay?.();
        }}
        onCanPlayThrough={() => {
          onCanPlayThrough?.();
        }}
        onPlaying={() => {
          clearLoadWatchdog();
          onPlaying?.();
        }}
        onError={() => {
          if (canFallback) {
            advanceToNextSource();
            return;
          }
          clearLoadWatchdog();
          onLoadError?.();
        }}
      />
    );
  },
);
