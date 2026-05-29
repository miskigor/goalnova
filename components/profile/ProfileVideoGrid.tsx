"use client";

import type { VideoRow } from "@/lib/supabase/playerPublicProfile";
import { ProfileVideoTile } from "@/components/profile/ProfileVideoTile";

type Props = {
  videos: VideoRow[];
  canDelete?: boolean;
  deletingVideoId?: string | null;
  onDelete?: (videoId: string) => void;
};

export function ProfileVideoGrid({
  videos,
  canDelete = false,
  deletingVideoId = null,
  onDelete,
}: Props) {
  return (
    <ul className="box-border grid w-full min-w-0 max-w-full grid-cols-3 gap-1 overflow-hidden sm:gap-2">
      {videos.map((video, index) => (
        <li
          key={video.id ?? `${video.created_at ?? "video"}-${index}`}
          className="min-w-0 max-w-full shrink-0 overflow-hidden"
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
