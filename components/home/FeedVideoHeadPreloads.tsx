"use client";

import { useLayoutEffect } from "react";

/**
 * Injects lightweight `<link rel="preload" as="video">` hints so the first clip starts
 * fetching at navigation time, and the upcoming clip can follow without loading the whole feed.
 */
export function FeedVideoHeadPreloads({
  firstHref,
  nextHref,
  thirdHref,
}: {
  firstHref: string | null;
  nextHref: string | null;
  /** Optional third clip hint while the first is active (warm N+2). */
  thirdHref?: string | null;
}) {
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const created: HTMLLinkElement[] = [];

    const push = (href: string, fetchPriority: "high" | "low") => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = href;
      link.setAttribute("fetchpriority", fetchPriority);
      link.setAttribute("data-pitchrusch-feed-video-preload", "1");
      document.head.appendChild(link);
      created.push(link);
    };

    if (firstHref) push(firstHref, "high");
    if (nextHref && nextHref !== firstHref) push(nextHref, "high");
    if (
      thirdHref &&
      thirdHref !== firstHref &&
      thirdHref !== nextHref
    ) {
      push(thirdHref, "high");
    }

    return () => {
      created.forEach((l) => l.remove());
    };
  }, [firstHref, nextHref, thirdHref]);

  return null;
}
