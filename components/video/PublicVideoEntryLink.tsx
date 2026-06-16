"use client";

import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  setVideoEntryCookie,
  type VideoEntrySource,
} from "@/lib/video/videoEntryCookie";

type Props = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: ComponentProps<typeof Link>["href"];
  entryFrom?: VideoEntrySource;
  children: ReactNode;
};

/** Crawlable `/video/:id` href; entry context stored in a short-lived cookie. */
export function PublicVideoEntryLink({ href, entryFrom, children, ...rest }: Props) {
  return (
    <Link
      href={href}
      onClick={() => {
        if (entryFrom) setVideoEntryCookie(entryFrom);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
