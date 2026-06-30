"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HomeCleanVideoCardV3 } from "@/components/home/v3-clean/HomeCleanVideoCardV3";
import { FeedVideoHeadPreloads } from "@/components/home/FeedVideoHeadPreloads";
import { useHomeFeedSound } from "@/components/home/HomeFeedSoundContext";
import { feedItemVideoKey } from "@/lib/feed/feedItemVideoKey";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import {
  homeFeedPlaybackCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";
import { isHomeFeedMobileViewport } from "@/components/home/homeFeedMobileScrollReset";
import { HOME_CLEAN_V3_CARD_LOCK_STYLE } from "@/components/home/v3-clean/homeCleanV3LayoutLock";

type Props = {
  items: AugmentedHomeFeedItem[];
  /** Fired when the user scrolls near the end of the loaded list (throttled). */
  onNearEnd?: () => void;
  loadingMore?: boolean;
};

export function HomeCleanFeedScroll({
  items,
  onNearEnd,
  loadingMore = false,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const lastNearEndAtRef = useRef(0);
  const onNearEndRef = useRef(onNearEnd);
  onNearEndRef.current = onNearEnd;
  const { activeVideoId, notifyFeedUserActivation, reportScrollSnapBoost } =
    useHomeFeedSound();

  const snapVideoKeys = useMemo(
    () => items.map((item) => feedItemVideoKey(item)),
    [items],
  );

  const activeFeedIndex = useMemo(() => {
    if (!activeVideoId) return activeIndex;
    const i = items.findIndex((it) => feedItemVideoKey(it) === activeVideoId);
    return i >= 0 ? i : activeIndex;
  }, [activeVideoId, activeIndex, items]);

  const firstPreloadHref = useMemo(() => {
    if (items.length === 0) return null;
    const candidates = homeFeedPlaybackCandidates(items[0].video);
    const href = (candidates[0] ?? videoPlaybackUrl(items[0].video)).trim();
    return href.length > 0 ? href : null;
  }, [items]);

  const nextPreloadHref = useMemo(() => {
    if (activeFeedIndex + 1 >= items.length) return null;
    const candidates = homeFeedPlaybackCandidates(
      items[activeFeedIndex + 1].video,
    );
    const href = (
      candidates[0] ?? videoPlaybackUrl(items[activeFeedIndex + 1].video)
    ).trim();
    return href.length > 0 ? href : null;
  }, [activeFeedIndex, items]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    const sync = () => {
      if (isHomeFeedMobileViewport()) {
        const height = el.clientHeight;
        if (height > 0) {
          el.style.setProperty("--home-clean-v3-slide-height", `${height}px`);
        }
      }
      const key = snapVideoKeys[0];
      if (key) reportScrollSnapBoost(key);
      setActiveIndex(0);
    };

    sync();
    requestAnimationFrame(sync);
  }, [items.length, reportScrollSnapBoost, snapVideoKeys]);

  const updateActiveIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const pageHeight = el.clientHeight;
    if (pageHeight <= 0) return;
    const index = Math.max(
      0,
      Math.min(items.length - 1, Math.round(el.scrollTop / pageHeight)),
    );
    setActiveIndex(index);
    const key = snapVideoKeys[index];
    if (key) reportScrollSnapBoost(key);
  }, [items.length, reportScrollSnapBoost, snapVideoKeys]);

  const updateDesktopActiveFromViewport = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isHomeFeedMobileViewport()) return;

    const slides = el.querySelectorAll("[data-home-clean-v3-slide]");
    if (slides.length === 0) return;

    const viewportMid = window.innerHeight / 2;
    let bestIndex = 0;
    let bestDist = Infinity;

    slides.forEach((node, index) => {
      if (!(node instanceof HTMLElement)) return;
      const rect = node.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(mid - viewportMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = index;
      }
    });

    setActiveIndex(bestIndex);
    const key = snapVideoKeys[bestIndex];
    if (key) reportScrollSnapBoost(key);
  }, [reportScrollSnapBoost, snapVideoKeys]);

  const maybeLoadMore = useCallback(() => {
    const cb = onNearEndRef.current;
    if (!cb) return;

    const now = Date.now();
    if (now - lastNearEndAtRef.current < 650) return;

    const el = scrollRef.current;
    let nearEnd = false;

    if (el && isHomeFeedMobileViewport()) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (clientHeight > 0 && scrollHeight > 0) {
        nearEnd =
          scrollHeight - scrollTop - clientHeight <= clientHeight * 0.65;
      }
    } else {
      const scrollTop =
        window.scrollY || document.documentElement.scrollTop || 0;
      const clientHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      if (clientHeight > 0 && scrollHeight > 0) {
        nearEnd =
          scrollHeight - scrollTop - clientHeight <= clientHeight * 0.65;
      }
    }

    if (!nearEnd) return;
    lastNearEndAtRef.current = now;
    cb();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const syncSlideHeight = () => {
      if (!isHomeFeedMobileViewport()) {
        el.style.removeProperty("--home-clean-v3-slide-height");
        return;
      }
      const height = el.clientHeight;
      if (height > 0) {
        el.style.setProperty("--home-clean-v3-slide-height", `${height}px`);
      }
    };

    const unlock = () => notifyFeedUserActivation();

    const onScroll = () => {
      if (el.scrollLeft !== 0) el.scrollLeft = 0;
      updateActiveIndex();
      maybeLoadMore();
    };

    let observer: ResizeObserver | null = null;

    const bindMobileScroll = () => {
      syncSlideHeight();
      if (!isHomeFeedMobileViewport()) return;

      observer = new ResizeObserver(syncSlideHeight);
      observer.observe(el);
      el.addEventListener("scroll", onScroll, { passive: true });
      el.addEventListener("touchstart", unlock, { passive: true });
      el.addEventListener("wheel", unlock, { passive: true });
      updateActiveIndex();
    };

    const bindDesktopScroll = () => {
      if (isHomeFeedMobileViewport()) return;
      const onDesktopScroll = () => {
        updateDesktopActiveFromViewport();
        maybeLoadMore();
      };
      updateDesktopActiveFromViewport();
      maybeLoadMore();
      document.addEventListener("scroll", onDesktopScroll, {
        passive: true,
        capture: true,
      });
      window.addEventListener("wheel", unlock, { passive: true });
      return onDesktopScroll;
    };

    const unbindDesktopScroll = (onDesktopScroll?: () => void) => {
      if (onDesktopScroll) {
        document.removeEventListener("scroll", onDesktopScroll, {
          capture: true,
        });
      }
      window.removeEventListener("wheel", unlock);
    };

    const unbindMobileScroll = () => {
      observer?.disconnect();
      observer = null;
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("touchstart", unlock);
      el.removeEventListener("wheel", unlock);
    };

    let desktopScrollHandler: (() => void) | undefined;

    const onViewportChange = () => {
      unbindMobileScroll();
      unbindDesktopScroll(desktopScrollHandler);
      syncSlideHeight();
      bindMobileScroll();
      desktopScrollHandler = bindDesktopScroll();
    };

    onViewportChange();
    window.addEventListener("resize", onViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", onViewportChange);
      unbindMobileScroll();
      unbindDesktopScroll(desktopScrollHandler);
    };
  }, [
    maybeLoadMore,
    notifyFeedUserActivation,
    updateActiveIndex,
    updateDesktopActiveFromViewport,
  ]);

  return (
    <>
      {firstPreloadHref ? (
        <FeedVideoHeadPreloads
          firstHref={firstPreloadHref}
          nextHref={nextPreloadHref}
        />
      ) : null}
      <div ref={scrollRef} data-home-clean-v3-scroll-root>
        <div data-home-clean-v3-feed>
          {items.map((item, index) => (
            <div
              key={feedItemVideoKey(item)}
              data-home-clean-v3-slide
              data-home-clean-v3-slide-index={index}
            >
              <HomeCleanVideoCardV3
                item={item}
                feedIndex={index}
                activeFeedIndex={activeFeedIndex}
              />
            </div>
          ))}
          {loadingMore ? (
            <div data-home-clean-v3-slide data-home-clean-v3-slide-loading>
              <div data-home-clean-v3-page>
                <div
                  data-home-clean-v3-card
                  style={HOME_CLEAN_V3_CARD_LOCK_STYLE}
                >
                  <div
                    data-home-clean-v3-loading-spinner
                    role="status"
                    aria-busy
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
