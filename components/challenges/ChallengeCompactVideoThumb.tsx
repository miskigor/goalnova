"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";
import { useExploreTileMobileLike } from "@/lib/video/exploreTileMobile";
import { useMediaNearViewport } from "@/lib/video/useMediaNearViewport";
import {
  exploreTilePrimaryImageUrl,
  exploreTileVideoPosterAttribute,
  exploreTileVideoSrcCandidates,
  type VideoWithOptionalThumbnail,
} from "@/lib/video/exploreTileMedia";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { gnVideoMediaDataProps } from "@/lib/video/videoMediaDisplayClasses";

export const CHALLENGE_COMPACT_THUMB_STAGE_CLASS =
  "relative box-border aspect-[9/16] w-[4.75rem] shrink-0 overflow-hidden rounded-xl border border-gn-border-subtle bg-neutral-900 sm:w-[5.5rem]";

const THUMB_VIDEO_CLASS =
  "pointer-events-none absolute inset-0 z-0 size-full object-cover object-center [color-scheme:dark]";

type Props = {
  videoId: string;
  video: VideoWithOptionalThumbnail;
  profileAvatarUrl?: string | null;
  ariaLabel: string;
  className?: string;
};

function PlayOverlay() {
  return (
    <span
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/10"
      aria-hidden
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-black/55 text-white shadow-md backdrop-blur-sm">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M8 6.5v11l9-5.5-9-5.5z" />
        </svg>
      </span>
    </span>
  );
}

export function ChallengeCompactVideoThumb({
  videoId,
  video,
  profileAvatarUrl,
  ariaLabel,
  className = "",
}: Props) {
  const isMobileLike = useExploreTileMobileLike();
  const { containerRef, loadMedia } = useMediaNearViewport({
    rootMargin: "200px 0px 200px 0px",
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const candidates = exploreTileVideoSrcCandidates(video);
  const src = candidates[0] ?? videoPlaybackUrl(video) ?? "";
  const poster = exploreTileVideoPosterAttribute(video, profileAvatarUrl);
  const rasterImage = exploreTilePrimaryImageUrl(video);
  const stillSrc = rasterImage || poster || null;

  const [videoFailed, setVideoFailed] = useState(false);
  const preferStillOnMobile = isMobileLike && Boolean(stillSrc);
  const showVideo = Boolean(src && loadMedia && !videoFailed && !preferStillOnMobile);

  useIosInlineVideoFirstFrameBump(videoRef, showVideo, showVideo ? src : "");

  const videoHref = `/video/${encodeURIComponent(videoId)}` as const;

  return (
    <Link
      href={videoHref}
      className={`block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gn-accent/60 ${className}`}
      aria-label={ariaLabel}
    >
      <div
        ref={containerRef}
        {...gnVideoMediaDataProps}
        className={CHALLENGE_COMPACT_THUMB_STAGE_CLASS}
      >
        {showVideo ? (
          <video
            ref={videoRef}
            className={THUMB_VIDEO_CLASS}
            src={src}
            poster={poster || undefined}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
            onError={() => setVideoFailed(true)}
          />
        ) : stillSrc ? (
          <Image
            src={stillSrc}
            alt=""
            fill
            sizes="88px"
            className="object-cover object-center"
            unoptimized
          />
        ) : null}
        <PlayOverlay />
      </div>
    </Link>
  );
}
