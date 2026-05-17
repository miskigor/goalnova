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
    <ul className="box-border grid w-full min-w-0 max-w-full grid-cols-3 gap-1.5 overflow-hidden sm:gap-2 [contain:layout]">
      {videos.map((video, index) => (
        <li
          key={video.id ?? `${video.created_at ?? "video"}-${index}`}
          className="min-w-0 max-w-full overflow-hidden"
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
