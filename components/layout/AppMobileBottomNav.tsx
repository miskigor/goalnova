"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavIcon } from "@/components/icons/NavIcons";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import { useNavSession } from "@/components/layout/useNavSession";
import { supabase } from "@/lib/supabase/client";
import {
  APP_SHELL_ADMIN_MOBILE_BOTTOM_NAV,
  APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV,
  APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED,
  type ShellMobileNavItem,
} from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import {
  APP_MOBILE_BOTTOM_NAV_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS,
  APP_MOBILE_BOTTOM_NAV_INNER_CLASS,
  APP_MOBILE_BOTTOM_NAV_ITEM_CLASS,
  APP_MOBILE_BOTTOM_NAV_PROFILE_CELL_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_BUTTON_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_LINK_CLASS,
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

/** Scout app routes: show scout tab bar before async role verification finishes. */
function isScoutAppPath(pathname: string): boolean {
  return (
    pathname === "/scout-dashboard" ||
    pathname.startsWith("/scout-dashboard/") ||
    pathname === "/scout-apply" ||
    pathname.startsWith("/scout-apply/")
  );
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

function uploadButtonClass(pathname: string) {
  const active = navItemActive(pathname, "/upload");
  return [
    APP_MOBILE_BOTTOM_NAV_UPLOAD_BUTTON_CLASS,
    active ? "ring-2 ring-inset ring-orange-200/90" : "",
  ].join(" ");
}

function playerTabEmoji(href: ShellMobileNavItem["href"]): string | null {
  return PLAYER_TAB_EMOJI[href] ?? null;
}

function profileMenuPathActive(pathname: string): boolean {
  return (
    navItemActive(pathname, "/profile") ||
    navItemActive(pathname, "/premium") ||
    navItemActive(pathname, "/benefits") ||
    navItemActive(pathname, "/notifications") ||
    navItemActive(pathname, "/messages") ||
    navItemActive(pathname, "/settings") ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/messages/")
  );
}

export function AppMobileBottomNav() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const { user } = useNavSession();
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const { loaded, row, isApprovedScout } = useScoutVerification();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  const items = useMemo(() => {
    const isScout = loaded && row?.role === "scout";
    if (isScout) {
      if (isApprovedScout) return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV;
      return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED;
    }
    if (adminLoaded && isAdmin && loaded && row?.role !== "player") {
      return APP_SHELL_ADMIN_MOBILE_BOTTOM_NAV;
    }
    if (isScoutAppPath(pathname)) {
      if (pathname === "/scout-apply" || pathname.startsWith("/scout-apply/")) {
        return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV_UNVERIFIED;
      }
      return APP_SHELL_SCOUT_MOBILE_BOTTOM_NAV;
    }
    return APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV;
  }, [adminLoaded, isAdmin, loaded, row?.role, isApprovedScout, pathname]);

  const usePlayerEmojis = items === APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV;
  const usePlayerProfileMenu = usePlayerEmojis;

  useEffect(() => {
    if (!usePlayerProfileMenu || !user?.id) {
      setProfileAvatarUrl(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("users")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const url = typeof data?.avatar_url === "string" ? data.avatar_url.trim() : "";
        setProfileAvatarUrl(url || null);
      });
    return () => {
      cancelled = true;
    };
  }, [usePlayerProfileMenu, user?.id]);

  return (
    <nav
      data-app-bottom-nav
      className={`${APP_MOBILE_BOTTOM_NAV_CLASS} pointer-events-auto`}
      aria-label={tNav("primary")}
    >
      <div className={APP_MOBILE_BOTTOM_NAV_INNER_CLASS}>
        {items.map((item) => {
          const label = mobileBottomNavDisplayLabel(tNav(item.labelKey));
          const active = navItemActive(pathname, item.href);
          const title = tNav(item.labelKey);

          if (item.href === "/upload") {
            return (
              <Link
                key={`${item.href}-${item.labelKey}`}
                href={item.href}
                className={APP_MOBILE_BOTTOM_NAV_UPLOAD_LINK_CLASS}
                aria-current={active ? "page" : undefined}
                aria-label={title}
              >
                <span className={uploadButtonClass(pathname)}>
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

          if (item.href === "/profile" && usePlayerProfileMenu && user) {
            const profileActive = profileMenuPathActive(pathname);
            const hasAvatar = Boolean(profileAvatarUrl?.trim());
            return (
              <div
                key={`${item.href}-${item.labelKey}`}
                className={[
                  APP_MOBILE_BOTTOM_NAV_PROFILE_CELL_CLASS,
                  profileActive ? "text-gn-accent" : "text-gn-text-secondary",
                ].join(" ")}
              >
                <div
                  className={
                    hasAvatar
                      ? "relative shrink-0 overflow-visible"
                      : "relative shrink-0 overflow-visible [&_button_span.relative]:opacity-0"
                  }
                >
                  <NavUserMenu user={user} bottomNavTrigger mobileMoreInMenu />
                  {!hasAvatar ? (
                    <span
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      aria-hidden
                    >
                      <NavIcon
                        name="profile"
                        variant="tabBar"
                        className="size-5 shrink-0 min-[360px]:size-[22px]"
                      />
                    </span>
                  ) : null}
                </div>
                <span
                  className="w-full min-w-0 max-w-full truncate px-0.5 text-center"
                  title={title}
                >
                  {label}
                </span>
              </div>
            );
          }

          if (item.href === "/profile" && usePlayerProfileMenu && !user) {
            return (
              <Link
                key={`${item.href}-${item.labelKey}`}
                href={item.href}
                className={bottomItemClass(pathname, item.href)}
                aria-current={active ? "page" : undefined}
                aria-label={title}
              >
                <NavIcon
                  name="profile"
                  variant="tabBar"
                  className="size-5 shrink-0 min-[360px]:size-[22px]"
                />
                <span
                  className="w-full min-w-0 max-w-full truncate px-0.5 text-center"
                  title={title}
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
              aria-label={title}
            >
              {usePlayerEmojis && playerTabEmoji(item.href) ? (
                <span className={PLAYER_TAB_EMOJI_CLASS} aria-hidden>
                  {playerTabEmoji(item.href)}
                </span>
              ) : (
                <NavIcon
                  name={item.icon}
                  variant="tabBar"
                  className="size-5 shrink-0 min-[360px]:size-[22px]"
                />
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
