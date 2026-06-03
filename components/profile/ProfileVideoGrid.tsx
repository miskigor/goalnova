"use client";

import type { VideoRow } from "@/lib/supabase/playerPublicProfile";
import { ProfileVideoTile } from "@/components/profile/ProfileVideoTile";

type Props = {
  videos: VideoRow[];
  canDelete?: boolean;
  deletingVideoId?: string | null;
  onDelete?: (videoId: string) => void;
  /** `/player/[slug]` public profile (not own `/profile`). */
  publicProfile?: boolean;
};

export function ProfileVideoGrid({
  videos,
  canDelete = false,
  deletingVideoId = null,
  onDelete,
  publicProfile = false,
}: Props) {
  return (
    <ul
      data-profile-video-grid
      data-profile-videos-rendered={videos.length > 0 ? "yes" : "no"}
      data-profile-videos-count={videos.length}
      {...(publicProfile
        ? {
            "data-public-profile-video-grid": "",
            "data-public-profile-videos-count": videos.length,
          }
        : {})}
      className="box-border grid w-full min-w-0 max-w-full grid-cols-3 items-start gap-1 overflow-hidden sm:gap-2"
    >
      {videos.map((video, index) => (
        <li
          key={video.id ?? `${video.created_at ?? "video"}-${index}`}
          data-profile-video-cell
          {...(publicProfile ? { "data-public-profile-video-cell": "" } : {})}
          className="relative aspect-[9/16] w-full min-w-0 max-w-full shrink-0 overflow-hidden"
        >
          <ProfileVideoTile
            video={video}
            canDelete={canDelete}
            deleting={Boolean(video.id && deletingVideoId === video.id)}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}
