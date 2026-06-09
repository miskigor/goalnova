"use client";

import { Link } from "@/i18n/navigation";
import type { ComponentProps, ReactNode } from "react";
import { buildPlayerProfilePath } from "@/lib/player/buildPlayerProfilePath";

type Props = Omit<ComponentProps<typeof Link>, "href" | "children"> & {
  userId: string | null | undefined;
  username?: string | null;
  children: ReactNode;
};

export function PlayerProfileNavLink({
  userId,
  username,
  className,
  children,
  ...rest
}: Props) {
  const path = buildPlayerProfilePath(userId, username);
  if (!path) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={path} prefetch className={className} {...rest}>
      {children}
    </Link>
  );
}
