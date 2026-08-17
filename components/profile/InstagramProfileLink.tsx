"use client";

import { instagramDisplayHandle, instagramHttpsUrl, openInstagramProfile } from "@/lib/instagram/playerInstagram";

type Props = {
  handle: string;
  className?: string;
};

export function InstagramProfileLink({ handle, className = "" }: Props) {
  const href = instagramHttpsUrl(handle);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-w-0 items-center font-medium text-gn-accent hover:underline ${className}`}
      onClick={(event) => {
        event.preventDefault();
        openInstagramProfile(handle);
      }}
    >
      {instagramDisplayHandle(handle)}
    </a>
  );
}
