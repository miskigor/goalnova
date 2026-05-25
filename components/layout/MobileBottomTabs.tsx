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
import { MOBILE_BOTTOM_TABS_V2_CLASS } from "@/lib/layout/appShellClasses";
import { mobileBottomNavDisplayLabel } from "@/lib/layout/mobileBottomNavLabel";

/** Compact V2 bottom chrome — local only (more feed space, still tappable). */
const COMPACT_BOTTOM_TABS_INNER_CLASS =
  "pointer-events-auto box-border grid h-11 min-h-[2.75rem] w-full min-w-0 max-w-full grid-cols-5 items-end justify-items-center gap-0 overflow-x-clip ps-[max(0.5rem,env(safe-area-inset-left,0px))] pe-[max(0.5rem,env(safe-area-inset-right,0px))]";

const COMPACT_BOTTOM_TABS_ITEM_CLASS =
  "flex h-9 w-full min-w-0 max-w-full flex-col items-center justify-center gap-0 overflow-visible rounded-md border border-transparent px-0 py-0 text-[9px] font-medium leading-none tracking-tight min-[360px]:text-[10px]";

const COMPACT_UPLOAD_FAB_CLASS =
  "pointer-events-auto -mt-3 flex w-full min-w-0 max-w-full flex-col items-center justify-end gap-0";

const COMPACT_TAB_LABEL_CLASS =
  "w-full min-w-0 max-w-full truncate px-0.5 text-center text-[9px] font-medium leading-none min-[360px]:text-[10px]";

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
    COMPACT_BOTTOM_TABS_ITEM_CLASS,
    "transition-[color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "border-gn-accent/35 bg-gn-accent/10 text-gn-accent"
      : "text-gn-text-secondary hover:border-gn-border-subtle hover:bg-gn-surface/40 hover:text-gn-text",
  ].join(" ");
}

function uploadFabClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    COMPACT_UPLOAD_FAB_CLASS,
    active ? "text-gn-accent" : "text-gn-text-secondary",
  ].join(" ");
}

function uploadFabButtonClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 shadow-[0_4px_14px_rgba(249,115,22,0.4)] transition active:scale-[0.96]",
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
      className={`${MOBILE_BOTTOM_TABS_V2_CLASS} pt-0 pb-[max(0.125rem,env(safe-area-inset-bottom,0px))]`}
      aria-label={tNav("primary")}
    >
      <div className={COMPACT_BOTTOM_TABS_INNER_CLASS}>
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
                  <NavIcon name={item.icon} variant="tabBar" className="size-5 shrink-0" />
                </span>
                <span className={COMPACT_TAB_LABEL_CLASS} title={tNav(item.labelKey)}>
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
              <NavIcon name={item.icon} variant="tabBar" className="size-5 shrink-0" />
              <span className={COMPACT_TAB_LABEL_CLASS} title={tNav(item.labelKey)}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
