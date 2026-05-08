"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ProfileInitialsAvatar } from "@/components/video/ProfileInitialsAvatar";

type Props = {
  name: string;
  imageUrl?: string | null;
  sizeClassName?: string;
  className?: string;
};

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

  useEffect(() => {
    setLoadFailed(false);
  }, [url]);

  if (url && !loadFailed) {
    return (
      <span
        className={[
          "relative shrink-0 overflow-hidden rounded-full border border-white/[0.12]",
          sizeClassName,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Image
          src={url}
          alt=""
          fill
          sizes="56px"
          className="object-cover"
          unoptimized
          referrerPolicy="no-referrer"
          onError={() => setLoadFailed(true)}
        />
      </span>
    );
  }

  return (
    <ProfileInitialsAvatar name={name} sizeClassName={sizeClassName} className={className} />
  );
}
