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

type Props = {
  items: AugmentedHomeFeedItem[];
};

export function HomeCleanFeedScroll({ items }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
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
      updateDesktopActiveFromViewport();
      document.addEventListener("scroll", updateDesktopActiveFromViewport, {
        passive: true,
        capture: true,
      });
      window.addEventListener("wheel", unlock, { passive: true });
    };

    const unbindDesktopScroll = () => {
      document.removeEventListener("scroll", updateDesktopActiveFromViewport, {
        capture: true,
      });
      window.removeEventListener("wheel", unlock);
    };

    const unbindMobileScroll = () => {
      observer?.disconnect();
      observer = null;
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("touchstart", unlock);
      el.removeEventListener("wheel", unlock);
    };

    const onViewportChange = () => {
      unbindMobileScroll();
      unbindDesktopScroll();
      syncSlideHeight();
      bindMobileScroll();
      bindDesktopScroll();
    };

    onViewportChange();
    window.addEventListener("resize", onViewportChange, { passive: true });

    return () => {
      window.removeEventListener("resize", onViewportChange);
      unbindMobileScroll();
      unbindDesktopScroll();
    };
  }, [
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
        </div>
      </div>
    </>
  );
}
