"use client";

import { FeedVideoEngagement } from "@/components/home/FeedVideoEngagement";
import { VideoShareButton } from "@/components/share/VideoShareButton";

type Props = {
  videoId: string;
  playerDisplayName: string;
  caption: string | null;
};

export function PublicVideoEngagementRow({
  videoId,
  playerDisplayName,
  caption,
}: Props) {
  return (
    <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-2.5 py-2">
      <FeedVideoEngagement
        videoId={videoId}
        compact
        trailingActions={
          <VideoShareButton
            videoId={videoId}
            playerDisplayName={playerDisplayName}
            caption={caption}
            iconOnly
          />
        }
      />
    </div>
  );
}
