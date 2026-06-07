"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { ScoutLayoutScrollLock } from "@/components/scout/ScoutLayoutScrollLock";
import {
  enableMlv2ScrollRestorationManual,
  scheduleMlv2ScrollReset,
} from "@/lib/layout/mlv2ScrollReset";
import {
  MLV2_CONTENT_ATTR,
  MLV2_CONTENT_MAX_CLASS,
  MLV2_ROUTE_ATTR,
} from "@/components/layout/mobile-v2/mobileLayoutStableV2.tokens";
import "@/components/scout/scoutPageLayout.css";

function isHomeRoute(pathname: string): boolean {
  return pathname === "/home" || pathname.startsWith("/home/");
}

function isProfileRoute(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

function isScoutDashboardOrApplyPath(pathname: string): boolean {
  return (
    pathname === "/scout-dashboard" ||
    pathname.startsWith("/scout-dashboard/") ||
    pathname === "/scout-apply" ||
    pathname.startsWith("/scout-apply/")
  );
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
  const pathname = usePathname() ?? "";
  const route = mlv2RouteKind(pathname);
  const { loaded: scoutLoaded, row } = useScoutVerification();
  const isScoutRole = scoutLoaded && row?.role === "scout";
  const isScoutProfile = route === "profile" && isScoutRole;
  const [scoutProfileDomReady, setScoutProfileDomReady] = useState(false);

  useLayoutEffect(() => {
    if (route !== "profile") {
      setScoutProfileDomReady(false);
      return;
    }

    const sync = () => {
      setScoutProfileDomReady(
        Boolean(document.querySelector("[data-scout-own-profile-page]")),
      );
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route, pathname]);

  const scoutShellActive =
    isScoutDashboardOrApplyPath(pathname) ||
    isScoutProfile ||
    (route === "profile" && scoutProfileDomReady);

  useLayoutEffect(() => {
    const restoreScrollRestoration = enableMlv2ScrollRestorationManual();
    return restoreScrollRestoration;
  }, []);

  useLayoutEffect(() => {
    return scheduleMlv2ScrollReset(pathname);
  }, [pathname]);

  return (
    <div
      {...{ [MLV2_CONTENT_ATTR]: "" }}
      {...{ [MLV2_ROUTE_ATTR]: route }}
      {...(scoutShellActive ? { "data-scout-shell-page": "" } : {})}
      {...(isScoutProfile || scoutProfileDomReady ? { "data-scout-own-profile-page": "" } : {})}
      className={[
        MLV2_CONTENT_MAX_CLASS,
        route === "home"
          ? "max-lg:flex max-lg:h-full max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:max-w-[min(100%,390px)] max-lg:mx-auto max-lg:px-0 max-lg:pb-0"
          : "max-lg:overflow-x-clip",
        route === "profile" || route === "public-player" ? "max-lg:pb-4" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {scoutShellActive ? <ScoutLayoutScrollLock /> : null}
      {children}
    </div>
  );
}
