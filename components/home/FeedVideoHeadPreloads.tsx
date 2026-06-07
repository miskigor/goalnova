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

    inject();

    return () => {
      cancelled = true;
      link?.remove();
      link = null;
    };
  }, [firstHref]);

  return null;
}
