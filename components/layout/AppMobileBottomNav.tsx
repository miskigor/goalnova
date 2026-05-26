"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import {
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED,
  type ShellMobileNavItem,
} from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { useNavSession } from "@/components/layout/useNavSession";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import {
  APP_MOBILE_BOTTOM_NAV_CLASS,
  APP_MOBILE_BOTTOM_NAV_INNER_CLASS,
  APP_MOBILE_BOTTOM_NAV_INNER_WITH_UPLOAD_FAB_CLASS,
  APP_MOBILE_BOTTOM_NAV_ITEM_CLASS,
  APP_MOBILE_BOTTOM_NAV_PROFILE_CELL_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_BUTTON_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_LINK_CLASS,
} from "@/lib/layout/appShellClasses";
import { mobileBottomNavDisplayLabel } from "@/lib/layout/mobileBottomNavLabel";

const BOTTOM_NAV_HOME_EMOJI = "🏠";
const BOTTOM_NAV_EXPLORE_EMOJI = "🔍";
const BOTTOM_NAV_UPLOAD_EMOJI = "📤";
const BOTTOM_NAV_CHALLENGES_EMOJI = "🏆";

const PLAYER_TAB_EMOJI: Partial<Record<ShellMobileNavItem["href"], string>> = {
  "/home": BOTTOM_NAV_HOME_EMOJI,
  "/explore": BOTTOM_NAV_EXPLORE_EMOJI,
  "/challenges": BOTTOM_NAV_CHALLENGES_EMOJI,
};

const PLAYER_TAB_EMOJI_CLASS = `${APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS} text-[1.25rem] min-[360px]:text-[1.375rem]`;

/** Player mobile tabs: Home · Explore · Upload (orange) · Challenges · Profile (menu). */
const PLAYER_MOBILE_BOTTOM_NAV: ShellMobileNavItem[] = [
  { href: "/home", labelKey: "home", icon: "home" },
  { href: "/explore", labelKey: "explore", icon: "explore" },
  { href: "/upload", labelKey: "upload", icon: "upload" },
  { href: "/challenges", labelKey: "challenges", icon: "challenges" },
  { href: "/profile", labelKey: "profile", icon: "profile" },
];

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

function playerTabEmoji(href: ShellMobileNavItem["href"]): string | null {
  return PLAYER_TAB_EMOJI[href] ?? null;
}

function isProfileTab(item: ShellMobileNavItem): boolean {
  return item.href === "/profile";
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

function centerFabLinkClass() {
  return APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_LINK_CLASS;
}

function uploadEmojiButtonClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    APP_MOBILE_BOTTOM_NAV_UPLOAD_FAB_BUTTON_CLASS,
    active ? "ring-2 ring-inset ring-orange-200/90" : "",
  ].join(" ");
}

function BottomNavProfileMenu({ label, title }: { label: string; title: string }) {
  const { user } = useNavSession();

  if (!user) {
    return (
      <Link
        href="/profile"
        className={bottomItemClass("", "/profile")}
        aria-label={title}
      >
        <NavIcon name="profile" variant="tabBar" className="size-5 shrink-0 min-[360px]:size-[22px]" />
        <span className="w-full min-w-0 max-w-full truncate px-0.5 text-center" title={title}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <div className={APP_MOBILE_BOTTOM_NAV_PROFILE_CELL_CLASS}>
      <NavUserMenu
        user={user}
        compactTrigger
        mobileMoreInMenu
        bottomNavTrigger
      />
      <span className="w-full min-w-0 max-w-full truncate px-0.5 text-center" title={title}>
        {label}
      </span>
    </div>
  );
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
    return PLAYER_MOBILE_BOTTOM_NAV;
  }, [loaded, row?.role, isApprovedScout, pathname]);

  const usePlayerUploadFab = items === PLAYER_MOBILE_BOTTOM_NAV;
  const innerClass = usePlayerUploadFab
    ? APP_MOBILE_BOTTOM_NAV_INNER_WITH_UPLOAD_FAB_CLASS
    : APP_MOBILE_BOTTOM_NAV_INNER_CLASS;

  return (
    <nav
      data-app-bottom-nav
      className={`${APP_MOBILE_BOTTOM_NAV_CLASS} pointer-events-auto`}
      aria-label={tNav("primary")}
    >
      <div className={innerClass}>
        {items.map((item) => {
          const label = mobileBottomNavDisplayLabel(tNav(item.labelKey));
          const active = navItemActive(pathname, item.href);
          const title = tNav(item.labelKey);

          if (usePlayerUploadFab && isUploadTab(item)) {
            return (
              <Link
                key={`${item.href}-${item.labelKey}`}
                href={item.href}
                className={centerFabLinkClass()}
                aria-current={active ? "page" : undefined}
                aria-label={title}
              >
                <span className={uploadEmojiButtonClass(pathname)}>
                  <span className={APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS} aria-hidden>
                    {BOTTOM_NAV_UPLOAD_EMOJI}
                  </span>
                </span>
                <span
                  className="w-full min-w-0 max-w-full truncate px-0.5 text-center text-[9px] font-medium leading-none min-[360px]:text-[10px]"
                  title={title}
                >
                  {label}
                </span>
              </Link>
            );
          }

          if (usePlayerUploadFab && isProfileTab(item)) {
            return (
              <BottomNavProfileMenu
                key={`${item.href}-${item.labelKey}`}
                label={label}
                title={title}
              />
            );
          }

          return (
            <Link
              key={`${item.href}-${item.labelKey}`}
              href={item.href}
              className={bottomItemClass(pathname, item.href)}
              aria-current={active ? "page" : undefined}
            >
              {usePlayerUploadFab && playerTabEmoji(item.href) ? (
                <span className={PLAYER_TAB_EMOJI_CLASS} aria-hidden>
                  {playerTabEmoji(item.href)}
                </span>
              ) : (
                <NavIcon name={item.icon} variant="tabBar" className="size-5 shrink-0 min-[360px]:size-[22px]" />
              )}
              <span
                className="w-full min-w-0 max-w-full truncate px-0.5 text-center"
                title={title}
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
