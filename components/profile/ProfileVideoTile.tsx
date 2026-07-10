"use client";

import { AdminVideoDownloadButton } from "@/components/admin/AdminVideoDownloadButton";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { VideoRow } from "@/lib/supabase/playerPublicProfile";
import { exploreTilePrimaryImageUrl } from "@/lib/video/exploreTileMedia";
import { useExploreTileMobileLike } from "@/lib/video/exploreTileMobile";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";
import { useMediaNearViewport } from "@/lib/video/useMediaNearViewport";
import {
  PROFILE_GRID_VIDEO_TILE_CLASS,
  gnVideoMediaDataProps,
} from "@/lib/video/videoMediaDisplayClasses";

type Props = {
  video: VideoRow;
  canDelete?: boolean;
  canAdminDownload?: boolean;
  deleting?: boolean;
  onDelete?: (videoId: string) => void;
};

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 6.5v11l9-5.5-9-5.5z" />
    </svg>
  );
}

export function ProfileVideoTile({
  video,
  canDelete = false,
  canAdminDownload = false,
  deleting = false,
  onDelete,
}: Props) {
  const t = useTranslations("playerProfile");
  const isMobileLike = useExploreTileMobileLike();
  const src = videoPlaybackUrl(video);
  const stillSrc = exploreTilePrimaryImageUrl(video) ?? null;
  const preferStillOnMobile = isMobileLike && Boolean(stillSrc);
  const href = useMemo(
    () => (video.id ? `/video/${encodeURIComponent(video.id)}` : null),
    [video.id],
  );
  const [duration, setDuration] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { containerRef, loadMedia } = useMediaNearViewport({
    rootMargin: "240px 0px 240px 0px",
  });

  useIosInlineVideoFirstFrameBump(
    videoRef,
    Boolean(src && loadMedia && !preferStillOnMobile),
    loadMedia && !preferStillOnMobile ? src : "",
  );

  const showVideo = Boolean(src && loadMedia && !preferStillOnMobile);

  const tile = (
    <div
      ref={containerRef}
      data-profile-video-tile
      {...gnVideoMediaDataProps}
      className="absolute inset-0 box-border overflow-hidden rounded-[0.85rem] border border-white/[0.08] bg-black"
    >
      {showVideo ? (
        <video
          ref={videoRef}
          className={PROFILE_GRID_VIDEO_TILE_CLASS}
          muted
          playsInline
          preload="metadata"
          src={src}
          tabIndex={-1}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) {
              setDuration(formatDuration(d));
            }
          }}
        />
      ) : stillSrc ? (
        <Image
          src={stillSrc}
          alt=""
          fill
          sizes="33vw"
          className="object-cover object-center"
          unoptimized
        />
      ) : src ? (
        <div className="absolute inset-0 bg-black" aria-hidden />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="pointer-events-none absolute bottom-2 left-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2 py-1 text-[10px] font-medium text-white/90">
          <PlayGlyph />
        </span>
      </div>
      {duration ? (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
          {duration}
        </div>
      ) : null}
    </div>
  );

  const deleteButton =
    canDelete && video.id && onDelete ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(video.id as string);
        }}
        disabled={deleting}
        className="absolute right-1.5 top-1.5 z-20 rounded-md border border-red-400/45 bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-red-200 transition hover:bg-red-900/35 disabled:opacity-50"
      >
        {deleting ? t("deletingVideo") : t("deleteVideo")}
      </button>
    ) : null;

  const downloadButton =
    canAdminDownload && video.id ? (
      <AdminVideoDownloadButton videoId={video.id} variant="profileTile" />
    ) : null;

  if (!href) {
    return (
      <div className="relative size-full">
        {tile}
        {downloadButton}
        {deleteButton}
      </div>
    );
  }
  return (
    <div className="relative size-full">
      <Link
        href={href}
        className="absolute inset-0 block overflow-hidden outline-none ring-offset-2 ring-offset-gn-bg focus-visible:ring-2 focus-visible:ring-gn-accent/50"
      >
        {tile}
      </Link>
      {downloadButton}
      {deleteButton}
    </div>
  );
}
