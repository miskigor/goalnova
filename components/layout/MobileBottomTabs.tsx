"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import {
  APP_SHELL_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED,
  type ShellMobileNavItem,
} from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import {
  MOBILE_BOTTOM_TABS_V2_CLASS,
  MOBILE_BOTTOM_TABS_V2_INNER_CLASS,
  MOBILE_BOTTOM_TABS_V2_ITEM_CLASS,
  MOBILE_BOTTOM_TABS_V2_UPLOAD_FAB_CLASS,
} from "@/lib/layout/appShellClasses";
import { mobileBottomNavDisplayLabel } from "@/lib/layout/mobileBottomNavLabel";

/** Scout app routes: show scout tab bar before async role verification finishes. */
function isScoutAppPath(pathname: string): boolean {
  return (
    pathname === "/scout-dashboard" ||
    pathname.startsWith("/scout-dashboard/") ||
    pathname === "/scout-apply" ||
    pathname.startsWith("/scout-apply/")
  );
}

function isPlayerUploadTab(item: ShellMobileNavItem): boolean {
  return item.href === "/upload";
}

function sideTabClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    MOBILE_BOTTOM_TABS_V2_ITEM_CLASS,
    "transition-[color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "border-gn-accent/35 bg-gn-accent/10 text-gn-accent"
      : "text-gn-text-secondary hover:border-gn-border-subtle hover:bg-gn-surface/40 hover:text-gn-text",
  ].join(" ");
}

function uploadFabClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    MOBILE_BOTTOM_TABS_V2_UPLOAD_FAB_CLASS,
    active ? "text-gn-accent" : "text-gn-text-secondary",
  ].join(" ");
}

function uploadFabButtonClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    "flex size-12 shrink-0 items-center justify-center rounded-full border-2 shadow-[0_6px_20px_rgba(249,115,22,0.45)] transition active:scale-[0.96]",
    active
      ? "border-gn-accent bg-gn-accent text-black"
      : "border-gn-accent/80 bg-gn-accent text-black hover:bg-gn-accent-hover",
  ].join(" ");
}

/**
 * V2 mobile bottom tabs (in-layout). Player set uses centered Upload FAB; scout sets unchanged.
 */
export function MobileBottomTabs() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const { loaded, row, isApprovedScout } = useScoutVerification();

  const items = useMemo(() => {
    const isScout = loaded && row?.role === "scout";
    if (isScout) {
      if (isApprovedScout) return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV;
      return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED;
    }
    if (isScoutAppPath(pathname)) {
      if (pathname === "/scout-apply" || pathname.startsWith("/scout-apply/")) {
        return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED;
      }
      return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV;
    }
    return APP_SHELL_MOBILE_BOTTOM_NAV;
  }, [loaded, row?.role, isApprovedScout, pathname]);

  const useUploadFab = items === APP_SHELL_MOBILE_BOTTOM_NAV;

  return (
    <nav
      data-mobile-bottom-tabs
      className={MOBILE_BOTTOM_TABS_V2_CLASS}
      aria-label={tNav("primary")}
    >
      <div className={MOBILE_BOTTOM_TABS_V2_INNER_CLASS}>
        {items.map((item) => {
          const label = mobileBottomNavDisplayLabel(tNav(item.labelKey));
          const active = navItemActive(pathname, item.href);

          if (useUploadFab && isPlayerUploadTab(item)) {
            return (
              <Link
                key={`${item.href}-${item.labelKey}`}
                href={item.href}
                className={uploadFabClass(pathname)}
                aria-current={active ? "page" : undefined}
                aria-label={tNav(item.labelKey)}
              >
                <span className={uploadFabButtonClass(pathname)}>
                  <NavIcon name={item.icon} variant="tabBar" className="size-6 shrink-0" />
                </span>
                <span
                  className="w-full min-w-0 max-w-full truncate px-0.5 text-center text-[9px] font-medium min-[360px]:text-[10px]"
                  title={tNav(item.labelKey)}
                >
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={`${item.href}-${item.labelKey}`}
              href={item.href}
              className={sideTabClass(pathname, item.href)}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon
                name={item.icon}
                variant="tabBar"
                className="size-5 shrink-0 min-[360px]:size-[22px]"
              />
              <span
                className="w-full min-w-0 max-w-full truncate px-0.5 text-center"
                title={tNav(item.labelKey)}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
