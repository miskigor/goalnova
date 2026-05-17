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
import { APP_MOBILE_BOTTOM_NAV_CLASS } from "@/lib/layout/appShellClasses";

function bottomItemClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    "group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[clamp(7.5px,2.35vw,10px)] font-semibold leading-[1.05] tracking-tight transition-[color,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors sm:text-[10px]",
    active
      ? "text-gn-accent"
      : "text-gn-text-tertiary hover:text-gn-text-secondary motion-safe:hover:scale-105",
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
      {items.map((item) => (
        <Link
          key={`${item.href}-${item.labelKey}`}
          href={item.href}
          className={bottomItemClass(pathname, item.href)}
          aria-current={navItemActive(pathname, item.href) ? "page" : undefined}
        >
          <NavIcon
            name={item.icon}
            className="size-[21px] shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110 min-[430px]:size-[22px]"
          />
          <span className="max-w-full truncate px-0.5 text-center">{tNav(item.labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}
