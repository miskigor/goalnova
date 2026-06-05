"use client";

import { useEffect, useState } from "react";
import { ProfileInitialsAvatar } from "@/components/video/ProfileInitialsAvatar";

type Props = {
  name: string;
  imageUrl?: string | null;
  sizeClassName?: string;
  className?: string;
};

function avatarDimensionPx(sizeClassName: string): number {
  const sizeToken = sizeClassName.match(/\bsize-(\d+)\b/);
  if (sizeToken) return Number(sizeToken[1]) * 4;
  const heightToken = sizeClassName.match(/\bh-(\d+)\b/);
  if (heightToken) return Number(heightToken[1]) * 4;
  return 56;
}

/**
 * Circular avatar: remote image when URL is set, otherwise initials from `name`.
 */
export function ProfileAvatar({
  name,
  imageUrl,
  sizeClassName = "h-14 w-14",
  className = "",
}: Props) {
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const [loadFailed, setLoadFailed] = useState(false);
  const dimPx = avatarDimensionPx(sizeClassName);
  const dimStyle = {
    width: dimPx,
    height: dimPx,
    minWidth: dimPx,
    minHeight: dimPx,
  };

  useEffect(() => {
    setLoadFailed(false);
  }, [url]);

  const shellClassName = [
    "relative block shrink-0 overflow-hidden rounded-full border border-white/20 bg-gn-surface-elevated",
    sizeClassName,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (url && !loadFailed) {
    return (
      <span data-profile-avatar className={shellClassName} style={dimStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase/public avatar URLs are arbitrary hosts */}
        <img
          src={url}
          alt=""
          width={dimPx}
          height={dimPx}
          className="block size-full object-cover"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setLoadFailed(true)}
        />
      </span>
    );
  }

  return (
    <ProfileInitialsAvatar
      name={name}
      sizeClassName={sizeClassName}
      className={shellClassName}
      style={dimStyle}
      data-profile-avatar
    />
  );
}
