"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import {
  APP_SHELL_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED,
} from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import {
  APP_MOBILE_BOTTOM_NAV_CLASS,
  APP_MOBILE_BOTTOM_NAV_INNER_CLASS,
  APP_MOBILE_BOTTOM_NAV_ITEM_CLASS,
} from "@/lib/layout/appShellClasses";
import { mobileBottomNavDisplayLabel } from "@/lib/layout/mobileBottomNavLabel";

function bottomItemClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    APP_MOBILE_BOTTOM_NAV_ITEM_CLASS,
    "transition-[color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "border-gn-accent/35 bg-gn-accent/10 text-gn-accent"
      : "text-gn-text-tertiary hover:border-gn-border-subtle hover:bg-gn-surface/40 hover:text-gn-text-secondary",
  ].join(" ");
}

export function AppMobileBottomNav() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const { loaded, row, isApprovedScout } = useScoutVerification();

  const items = useMemo(() => {
    const isScout = loaded && row?.role === "scout";
    if (!isScout) return APP_SHELL_MOBILE_BOTTOM_NAV;
    if (isApprovedScout) return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV;
    return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED;
  }, [loaded, row?.role, isApprovedScout]);

  return (
    <nav
      data-app-bottom-nav
      className={APP_MOBILE_BOTTOM_NAV_CLASS}
      aria-label={tNav("primary")}
    >
      <div className={APP_MOBILE_BOTTOM_NAV_INNER_CLASS}>
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.labelKey}`}
            href={item.href}
            className={bottomItemClass(pathname, item.href)}
            aria-current={navItemActive(pathname, item.href) ? "page" : undefined}
          >
            <NavIcon name={item.icon} className="size-5 shrink-0" />
            <span className="w-full min-w-0 px-0.5 text-center" title={tNav(item.labelKey)}>
              {mobileBottomNavDisplayLabel(tNav(item.labelKey))}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
