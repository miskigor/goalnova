"use client";

import type { VideoRow } from "@/lib/supabase/playerPublicProfile";
import { ProfileVideoTile } from "@/components/profile/ProfileVideoTile";

type Props = {
  videos: VideoRow[];
};

export function ProfileVideoGrid({ videos }: Props) {
  return (
    <ul className="grid w-full min-w-0 grid-cols-3 gap-1.5 overflow-hidden sm:gap-2">
      {videos.map((video, index) => (
        <li
          key={video.id ?? `${video.created_at ?? "video"}-${index}`}
          className="min-w-0"
        >
          <ProfileVideoTile video={video} />
        </li>
      ))}
    </ul>
  );
}
