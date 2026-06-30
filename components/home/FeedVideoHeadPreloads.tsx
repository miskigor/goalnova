"use client";

import { useEffect } from "react";

type PreloadKind = "active" | "next";

function upsertVideoPreload(href: string, kind: PreloadKind, priority: "high" | "low") {
  const attr = `data-pitchrusch-feed-video-preload-${kind}`;
  let link = document.querySelector<HTMLLinkElement>(`link[${attr}]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.setAttribute(attr, "");
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
  link.setAttribute("fetchpriority", priority);
}

function removeVideoPreload(kind: PreloadKind) {
  document
    .querySelector(`link[data-pitchrusch-feed-video-preload-${kind}]`)
    ?.remove();
}

/**
 * Head preloads for the active home-feed clip and the next slide (low priority).
 */
export function FeedVideoHeadPreloads({
  firstHref,
  nextHref,
}: {
  firstHref: string | null;
  nextHref?: string | null;
  /** @deprecated Not used — kept for {@link HomeFeed} call-site stability. */
  thirdHref?: string | null;
}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!firstHref) {
      removeVideoPreload("active");
      return;
    }

    upsertVideoPreload(firstHref, "active", "high");
    return () => {
      removeVideoPreload("active");
    };
  }, [firstHref]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!nextHref) {
      removeVideoPreload("next");
      return;
    }

    upsertVideoPreload(nextHref, "next", "low");
    return () => {
      removeVideoPreload("next");
    };
  }, [nextHref]);

  return null;
}
