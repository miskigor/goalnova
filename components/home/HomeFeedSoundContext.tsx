"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Ignore noise when picking the active slide (argmax among observers). */
const MIN_VISIBILITY = 0.001;
/** Drop a slide from the map only when it is essentially off-screen (avoids empty map mid-scroll). */
const VISIBILITY_REMOVE_BELOW = 0.001;
/**
 * TikTok-style handoff: prefer clips that fill ~most of the viewport (stable band ~0.55–0.7).
 * If none reach this bar during fast scroll, fall back to the strongest visible ratio.
 */
const ACTIVE_CLIP_RATIO_MIN = 0.55;

/** Session flag: user preference for feed audio while browsing (survives in-tab navigation). */
export const HOME_FEED_SOUND_SESSION_KEY = "pitchrusch-feed-sound";

type HomeFeedSoundContextValue = {
  /** When true, the active clip should play unmuted (unless the browser blocks autoplay). */
  isSoundEnabled: boolean;
  setSoundEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  /** Video id with strongest visibility in the feed (snap / scroll). */
  activeVideoId: string | null;
  reportVideoVisibility: (videoId: string, intersectionRatio: number) => void;
  /** Incremented when the user uses the sound rail control — retries play() after policy blocks. */
  playbackGeneration: number;
  requestPlaybackRetry: () => void;
  /**
   * Raste nakon interakcije na feedu (dodir / skrol / kotač), throttled — pomaže nesmutiranom play()
   * uz glazbu dok listaš.
   */
  feedUserActivationGeneration: number;
  notifyFeedUserActivation: () => void;
};

const HomeFeedSoundContext = createContext<HomeFeedSoundContextValue | null>(
  null,
);

export function HomeFeedSoundProvider({
  children,
  /** First visible clip key until IntersectionObserver reports ratios (instant play on home entry). */
  bootstrapActiveVideoId = null,
}: {
  children: ReactNode;
  bootstrapActiveVideoId?: string | null;
}) {
  const [isSoundEnabled, setSoundEnabledState] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const v = sessionStorage.getItem(HOME_FEED_SOUND_SESSION_KEY);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch {
      /* ignore */
    }
    return true;
  });
  const [visibility, setVisibility] = useState<Record<string, number>>({});
  const [playbackGeneration, setPlaybackGeneration] = useState(0);
  const [feedUserActivationGeneration, setFeedUserActivationGeneration] =
    useState(0);
  /** Throttle pointer/scroll bumps so listing the feed can retry unmuted play without spamming renders. */
  const lastFeedInteractionBumpRef = useRef(0);
  /** When the focused clip changes, retry audio policy + play() for the new active surface. */
  const prevActiveVideoIdRef = useRef<string | null>(null);

  const setSoundEnabled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setSoundEnabledState((prev) => {
        const next =
          typeof value === "function"
            ? (value as (p: boolean) => boolean)(prev)
            : value;
        try {
          sessionStorage.setItem(
            HOME_FEED_SOUND_SESSION_KEY,
            next ? "1" : "0",
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const requestPlaybackRetry = useCallback(() => {
    setPlaybackGeneration((g) => g + 1);
  }, []);

  const notifyFeedUserActivation = useCallback(() => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastFeedInteractionBumpRef.current < 72) return;
    lastFeedInteractionBumpRef.current = now;
    setFeedUserActivationGeneration((g) => g + 1);
  }, []);

  const reportVideoVisibility = useCallback(
    (videoId: string, intersectionRatio: number) => {
      setVisibility((prev) => {
        const next = { ...prev };
        if (intersectionRatio < VISIBILITY_REMOVE_BELOW) {
          delete next[videoId];
        } else {
          next[videoId] = intersectionRatio;
        }
        return next;
      });
    },
    [],
  );

  const activeVideoId = useMemo(() => {
    const entries = Object.entries(visibility);
    const promoted = entries.filter(([, r]) => r >= ACTIVE_CLIP_RATIO_MIN);
    const pool = promoted.length > 0 ? promoted : entries;

    let best: string | null = null;
    let bestR = 0;
    for (const [id, r] of pool) {
      if (r > bestR) {
        best = id;
        bestR = r;
      }
    }
    if (best != null && bestR >= MIN_VISIBILITY) return best;
    const boot =
      typeof bootstrapActiveVideoId === "string"
        ? bootstrapActiveVideoId.trim()
        : "";
    return boot.length > 0 ? boot : null;
  }, [bootstrapActiveVideoId, visibility]);

  /** Novi aktivni klip → retry play() i reset browser mute lock na tom surfaceu. */
  useEffect(() => {
    if (activeVideoId === prevActiveVideoIdRef.current) return;
    prevActiveVideoIdRef.current = activeVideoId;
    if (activeVideoId == null) return;
    setPlaybackGeneration((g) => g + 1);
  }, [activeVideoId]);

  const value = useMemo(
    () => ({
      isSoundEnabled,
      setSoundEnabled,
      activeVideoId,
      reportVideoVisibility,
      playbackGeneration,
      requestPlaybackRetry,
      feedUserActivationGeneration,
      notifyFeedUserActivation,
    }),
    [
      isSoundEnabled,
      setSoundEnabled,
      activeVideoId,
      reportVideoVisibility,
      playbackGeneration,
      requestPlaybackRetry,
      feedUserActivationGeneration,
      notifyFeedUserActivation,
    ],
  );

  return (
    <HomeFeedSoundContext.Provider value={value}>
      {children}
    </HomeFeedSoundContext.Provider>
  );
}

export function useHomeFeedSound(): HomeFeedSoundContextValue {
  const ctx = useContext(HomeFeedSoundContext);
  if (!ctx) {
    throw new Error(
      "useHomeFeedSound must be used within HomeFeedSoundProvider",
    );
  }
  return ctx;
}
