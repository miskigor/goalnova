"use client";

import { AdminVideoDownloadButton } from "@/components/admin/AdminVideoDownloadButton";
import { VideoShareButton } from "@/components/share/VideoShareButton";

type Props = {
  videoId: string;
  playerDisplayName: string;
  caption?: string | null;
  shareButtonClassName?: string;
};

export function VideoRailTrailingActions({
  videoId,
  playerDisplayName,
  caption,
  shareButtonClassName = "",
}: Props) {
  return (
    <>
      <AdminVideoDownloadButton
        videoId={videoId}
        iconOnly
        stopPropagation
        className={shareButtonClassName}
      />
      <VideoShareButton
        videoId={videoId}
        playerDisplayName={playerDisplayName}
        caption={caption}
        iconOnly
        stopPropagation
        className={shareButtonClassName}
      />
    </>
  );
}
