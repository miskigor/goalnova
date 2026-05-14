"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { APP_SHELL_MOBILE_BOTTOM_NAV } from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";

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
  const uploadEligibility = useVideoUploadEligibility();

  const items = useMemo(() => {
    return APP_SHELL_MOBILE_BOTTOM_NAV.map((item) => {
      if (item.href !== "/upload") return item;
      if (uploadEligibility === "player") return item;
      return {
        href: "/explore" as const,
        labelKey: "explore" as const,
        icon: "explore" as const,
      };
    });
  }, [uploadEligibility]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex min-w-0 max-w-[100vw] overflow-x-clip border-t border-gn-border-subtle bg-gn-bg/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pl-[max(0px,env(safe-area-inset-left,0px))] pr-[max(0px,env(safe-area-inset-right,0px))] pt-1 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90 lg:hidden"
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
