"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  HOME_FEED_MEDIA_GESTURE_SESSION_KEY,
  useHomeFeedSound,
} from "@/components/home/HomeFeedSoundContext";

function shouldOfferMediaGestureUnlock(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  try {
    if (sessionStorage.getItem(HOME_FEED_MEDIA_GESTURE_SESSION_KEY) === "1") {
      return false;
    }
  } catch {
    /* ignore read errors — still offer unlock */
  }
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (navigator.maxTouchPoints > 0 && /Android|Mobi/i.test(ua)) return true;
  return false;
}

/**
 * One-time transparent tap layer so the first muted `play()` runs inside a user gesture
 * (iOS / strict WebKit). Dismissed for the tab session after first tap.
 */
export function HomeFeedMediaGestureUnlock() {
  const tFeed = useTranslations("homeFeed");
  const { notifyFeedUserActivation, requestPlaybackRetry } = useHomeFeedSound();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldOfferMediaGestureUnlock());
  }, []);

  const onUnlock = useCallback(() => {
    try {
      sessionStorage.setItem(HOME_FEED_MEDIA_GESTURE_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    notifyFeedUserActivation(true);
    requestPlaybackRetry();
    setVisible(false);
  }, [notifyFeedUserActivation, requestPlaybackRetry]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[45] flex items-center justify-center p-6 max-lg:bottom-[var(--gn-app-bottom-nav-offset)]">
      <button
        type="button"
        aria-label={tFeed("tapToPlay")}
        className="pointer-events-auto touch-manipulation rounded-full border border-white/25 bg-black/60 px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-md active:scale-[0.98]"
        onPointerDownCapture={() => {
          onUnlock();
        }}
      >
        {tFeed("tapToPlay")}
      </button>
    </div>
  );
}
