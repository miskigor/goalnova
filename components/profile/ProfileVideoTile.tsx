"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import type { VideoRow } from "@/lib/supabase/playerPublicProfile";
import { hrefWithLocale } from "@/i18n/routing";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { useIosInlineVideoFirstFrameBump } from "@/lib/video/useIosInlineVideoFirstFrameBump";
import { useMediaNearViewport } from "@/lib/video/useMediaNearViewport";

type Props = {
  video: VideoRow;
  canDelete?: boolean;
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
  deleting = false,
  onDelete,
}: Props) {
  const t = useTranslations("playerProfile");
  const locale = useLocale();
  const src = videoPlaybackUrl(video);
  const href = useMemo(
    () => (video.id ? `/video/${encodeURIComponent(video.id)}` : null),
    [video.id],
  );
  const resolvedHref = useMemo(
    () => (href ? hrefWithLocale(href, locale) : null),
    [href, locale],
  );
  const [duration, setDuration] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { containerRef, loadMedia } = useMediaNearViewport({
    rootMargin: "240px 0px 240px 0px",
  });

  useIosInlineVideoFirstFrameBump(videoRef, Boolean(src && loadMedia), loadMedia ? src : "");

  const tile = (
    <div
      ref={containerRef}
      className="group relative h-full w-full overflow-hidden rounded-[0.85rem] border border-white/[0.08] bg-black"
      style={{ aspectRatio: "9 / 16" }}
    >
      {src && loadMedia ? (
        <video
          ref={videoRef}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          width={360}
          height={640}
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

  if (!resolvedHref) {
    return (
      <div className="relative">
        {tile}
        {deleteButton}
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <a
        href={resolvedHref}
        className="block h-full w-full outline-none ring-offset-2 ring-offset-gn-bg focus-visible:ring-2 focus-visible:ring-gn-accent/50"
      >
        {tile}
      </a>
      {deleteButton}
    </div>
  );
}
