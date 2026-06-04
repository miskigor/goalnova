"use client";

import { useEffect } from "react";

/**
 * Optional `<link rel="preload" as="video">` for the active home-feed clip only.
 * Deferred until after first paint so navigation does not compete with shell/feed UI.
 * N+1 / N+2 are not head-preloaded on open (see {@link FeedItemCard} preload tiers).
 */
export function FeedVideoHeadPreloads({
  firstHref,
}: {
  firstHref: string | null;
  /** @deprecated Not used on initial load — kept for {@link HomeFeed} call-site stability. */
  nextHref?: string | null;
  /** @deprecated Not used on initial load — kept for {@link HomeFeed} call-site stability. */
  thirdHref?: string | null;
}) {
  useEffect(() => {
    if (typeof document === "undefined" || !firstHref) return;

    let cancelled = false;
    let link: HTMLLinkElement | null = null;
    let raf2 = 0;

    const inject = () => {
      if (cancelled || link) return;
      link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = firstHref;
      link.setAttribute("fetchpriority", "high");
      link.setAttribute("data-pitchrusch-feed-video-preload", "active");
      document.head.appendChild(link);
    };

    // Wait for first paint before competing with document/CSS/JS on cold opens.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(inject);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      link?.remove();
      link = null;
    };
  }, [firstHref]);

  return null;
}
