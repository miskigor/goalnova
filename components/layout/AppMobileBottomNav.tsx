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
  APP_MOBILE_BOTTOM_NAV_CLASS,
  APP_MOBILE_BOTTOM_NAV_INNER_CLASS,
  APP_MOBILE_BOTTOM_NAV_INNER_WITH_UPLOAD_FAB_CLASS,
  APP_MOBILE_BOTTOM_NAV_ITEM_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_BUTTON_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_LINK_CLASS,
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

function isUploadTab(item: ShellMobileNavItem): boolean {
  return item.href === "/upload";
}

function bottomItemClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    APP_MOBILE_BOTTOM_NAV_ITEM_CLASS,
    "transition-[color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "border-gn-accent/35 bg-gn-accent/10 text-gn-accent"
      : "text-gn-text-secondary hover:border-gn-border-subtle hover:bg-gn-surface/40 hover:text-gn-text",
  ].join(" ");
}

function uploadFabLinkClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_LINK_CLASS,
    active ? "text-gn-accent" : "text-gn-text-secondary",
  ].join(" ");
}

function uploadFabButtonClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_BUTTON_CLASS,
    active ? "border-gn-accent" : "",
  ].join(" ");
}

export function AppMobileBottomNav() {
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
  const innerClass = useUploadFab
    ? APP_MOBILE_BOTTOM_NAV_INNER_WITH_UPLOAD_FAB_CLASS
    : APP_MOBILE_BOTTOM_NAV_INNER_CLASS;

  return (
    <nav
      data-app-bottom-nav
      className={APP_MOBILE_BOTTOM_NAV_CLASS}
      aria-label={tNav("primary")}
    >
      <div className={innerClass}>
        {items.map((item) => {
          const label = mobileBottomNavDisplayLabel(tNav(item.labelKey));
          const active = navItemActive(pathname, item.href);

          if (useUploadFab && isUploadTab(item)) {
            return (
              <Link
                key={`${item.href}-${item.labelKey}`}
                href={item.href}
                className={uploadFabLinkClass(pathname)}
                aria-current={active ? "page" : undefined}
                aria-label={tNav(item.labelKey)}
              >
                <span className={uploadFabButtonClass(pathname)}>
                  <NavIcon name={item.icon} variant="tabBar" className="size-[18px] shrink-0" />
                </span>
                <span
                  className="w-full min-w-0 max-w-full truncate px-0.5 text-center text-[9px] font-medium leading-none min-[360px]:text-[10px]"
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
              className={bottomItemClass(pathname, item.href)}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon name={item.icon} variant="tabBar" className="size-5 shrink-0 min-[360px]:size-[22px]" />
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
