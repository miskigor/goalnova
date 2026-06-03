"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  MLV2_CONTENT_ATTR,
  MLV2_CONTENT_MAX_CLASS,
  MLV2_ROUTE_ATTR,
} from "@/components/layout/mobile-v2/mobileLayoutStableV2.tokens";

function isHomeRoute(pathname: string): boolean {
  return pathname === "/home" || pathname.startsWith("/home/");
}

function isProfileRoute(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

/** Public `/player/[slug]` — not own `/profile`. */
function isPublicPlayerProfileRoute(pathname: string): boolean {
  return pathname === "/player" || pathname.startsWith("/player/");
}

type Mlv2RouteKind = "home" | "profile" | "public-player" | "tab";

function mlv2RouteKind(pathname: string): Mlv2RouteKind {
  if (isHomeRoute(pathname)) return "home";
  if (isProfileRoute(pathname)) return "profile";
  if (isPublicPlayerProfileRoute(pathname)) return "public-player";
  return "tab";
}

/** Uniform content column inside the V2 scrollport. */
export function MobileLayoutStableV2RouteFrame({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const route = mlv2RouteKind(pathname);

  return (
    <div
      {...{ [MLV2_CONTENT_ATTR]: "" }}
      {...{ [MLV2_ROUTE_ATTR]: route }}
      className={[
        MLV2_CONTENT_MAX_CLASS,
        route === "home"
          ? "max-lg:flex max-lg:h-full max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:pb-0"
          : "",
        route === "profile" || route === "public-player" ? "max-lg:pb-4" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
