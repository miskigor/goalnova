"use client";

import { FeedVideoEngagement } from "@/components/home/FeedVideoEngagement";
import { VideoShareButton } from "@/components/share/VideoShareButton";
import { PlaybackVideo } from "@/components/video/PlaybackVideo";
import {
  GN_VIDEO_MEDIA_ELEMENT_CLASS,
  GN_VIDEO_MEDIA_STAGE_FLEX_CLASS,
  gnVideoMediaDataProps,
} from "@/lib/video/videoMediaDisplayClasses";

type Props = {
  videoId: string;
  sources: string[];
  playerDisplayName: string;
  caption: string | null;
  /** Same aspect band as {@link ProfileVideoTile} (explore → watch). */
  layout?: "default" | "profile";
};

const SHARE_RAIL_CLASS =
  "[&_button]:flex [&_button]:!h-10 [&_button]:!w-10 [&_button]:min-h-0 [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:border-0 [&_button]:bg-white/10 [&_button]:p-0 [&_button]:text-white [&_button]:shadow-[0_4px_24px_rgba(0,0,0,0.35)] [&_button]:backdrop-blur-md [&_button]:hover:bg-white/16 [&_svg]:h-[18px] [&_svg]:w-[18px]";

export function PublicVideoWatchPlayer({
  videoId,
  sources,
  playerDisplayName,
  caption,
  layout = "default",
}: Props) {
  const captionText = caption?.trim() ?? "";
  const profileLayout = layout === "profile";
  const stageClass = profileLayout
    ? `relative aspect-[1/1] w-full min-w-0 max-w-full sm:aspect-[9/16] ${GN_VIDEO_MEDIA_STAGE_FLEX_CLASS}`
    : `relative aspect-[9/16] max-h-[min(82dvh,720px)] w-full min-w-0 max-w-full sm:aspect-auto sm:max-h-[min(75vh,640px)] ${GN_VIDEO_MEDIA_STAGE_FLEX_CLASS}`;
  const videoClass = profileLayout
    ? `relative z-0 ${GN_VIDEO_MEDIA_ELEMENT_CLASS}`
    : `relative z-0 sm:max-h-[min(75vh,640px)] ${GN_VIDEO_MEDIA_ELEMENT_CLASS}`;

  return (
    <div className="relative isolate mx-auto w-full min-w-0 max-w-full overflow-hidden bg-black sm:rounded-2xl sm:border sm:border-gn-border-subtle sm:shadow-lg">
      <div {...gnVideoMediaDataProps} className={stageClass}>
        <PlaybackVideo
          className={videoClass}
          sources={sources}
          preload="auto"
          fetchPriority="high"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/25 via-transparent to-black/60"
          aria-hidden
        />
        <div className="pointer-events-auto absolute end-[max(0.5rem,env(safe-area-inset-right,0px))] top-[max(0.5rem,env(safe-area-inset-top,0px))] bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] z-[42] flex w-11 shrink-0 flex-col items-center justify-end sm:end-3 sm:w-12">
          <FeedVideoEngagement
            videoId={videoId}
            variant="rail"
            trailingActions={
              <VideoShareButton
                videoId={videoId}
                playerDisplayName={playerDisplayName}
                caption={caption}
                iconOnly
                stopPropagation
                className={SHARE_RAIL_CLASS}
              />
            }
          />
        </div>
        {captionText ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 max-w-[calc(100%-3.5rem)] px-3 pb-3 pt-10 sm:max-w-[calc(100%-4rem)]">
            <p className="line-clamp-3 break-words text-sm leading-snug text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
              {captionText}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
