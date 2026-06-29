"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { useNavSession } from "@/components/layout/useNavSession";
import { supabase } from "@/lib/supabase/client";
import type { ShellMobileNavItem } from "@/lib/constants/navigation";
import {
  APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES,
  playerBottomNavPageIndex,
} from "@/lib/constants/playerMobileBottomNav";
import { navItemActive } from "@/lib/navigation/navItemActive";
import {
  APP_MOBILE_BOTTOM_NAV_CAROUSEL_TRACK_CLASS,
  APP_MOBILE_BOTTOM_NAV_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_ACTIVE_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_INACTIVE_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGE_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGER_CLASS,
  APP_MOBILE_BOTTOM_NAV_TAB_LABEL_CLASS,
  APP_MOBILE_BOTTOM_NAV_TAB_LINK_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_BUTTON_CLASS,
} from "@/lib/layout/appShellClasses";
import { mobileBottomNavDisplayLabel } from "@/lib/layout/mobileBottomNavLabel";
import { useDailyQuizStatus } from "@/hooks/useDailyQuizStatus";
import { challengesNavHref } from "@/lib/quiz/dailyQuizNav";

/** Full-color emoji for every player bottom-nav destination. */
const TAB_EMOJI: Record<ShellMobileNavItem["href"], string> = {
  "/home": "🏠",
  "/profile": "👤",
  "/upload": "📤",
  "/challenges": "🏆",
  "/explore": "🔍",
  "/messages": "💬",
  "/rankings": "🏅",
  "/clubs": "🏟️",
  "/premium": "⭐",
  "/benefits": "🎁",
  "/support": "🛟",
  "/settings": "⚙️",
  "/scout-dashboard": "📋",
  "/scout-apply": "✅",
  "/discover": "🔎",
  "/admin": "🛡️",
};

const TAB_EMOJI_CLASS = `${APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS} text-[1.25rem] min-[360px]:text-[1.3125rem]`;

function emojiBadgeClass(pathname: string, href: string, isUpload: boolean) {
  const active = navItemActive(pathname, href);
  if (isUpload) {
    return [
      APP_MOBILE_BOTTOM_NAV_UPLOAD_BUTTON_CLASS,
      active ? "ring-2 ring-inset ring-orange-200/90" : "",
    ].join(" ");
  }
  return [
    APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_CLASS,
    active
      ? APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_ACTIVE_CLASS
      : APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_INACTIVE_CLASS,
  ].join(" ");
}

function tabLabelClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    APP_MOBILE_BOTTOM_NAV_TAB_LABEL_CLASS,
    active ? "font-semibold text-gn-accent" : "text-gn-text-secondary",
  ].join(" ");
}

type NavTabProps = {
  item: ShellMobileNavItem;
  pathname: string;
  quizPending: boolean;
  profileAvatarUrl: string | null;
  userDisplayName: string | null;
};

function NavTab({ item, pathname, quizPending, profileAvatarUrl, userDisplayName }: NavTabProps) {
  const tNav = useTranslations("nav");
  const tQuiz = useTranslations("dailyQuiz");

  const label = mobileBottomNavDisplayLabel(tNav(item.labelKey));
  const href =
    item.href === "/challenges" && quizPending
      ? challengesNavHref(true)
      : item.href;
  const active = navItemActive(pathname, item.href);
  const title =
    item.href === "/challenges" && quizPending
      ? `${tNav(item.labelKey)} — ${tQuiz("navPendingHint")}`
      : tNav(item.labelKey);
  const itemKey = `${item.labelKey}-${item.href}`;
  const emoji = TAB_EMOJI[item.href] ?? "•";
  const isUpload = item.href === "/upload";

  if (item.href === "/profile" && profileAvatarUrl) {
    return (
      <Link
        key={itemKey}
        href={item.href}
        className={APP_MOBILE_BOTTOM_NAV_TAB_LINK_CLASS}
        aria-current={active ? "page" : undefined}
        aria-label={title}
      >
        <span
          className={[
            APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_CLASS,
            "overflow-hidden p-0",
            active
              ? APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_ACTIVE_CLASS
              : APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_INACTIVE_CLASS,
          ].join(" ")}
        >
          <ProfileAvatar
            imageUrl={profileAvatarUrl}
            name={userDisplayName ?? tNav("profile")}
            sizeClassName="h-9 w-9"
            className="!size-9 !min-h-9 !min-w-9 shrink-0"
          />
        </span>
        <span className={tabLabelClass(pathname, item.href)} title={title}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      key={itemKey}
      href={href}
      className={APP_MOBILE_BOTTOM_NAV_TAB_LINK_CLASS}
      aria-current={active ? "page" : undefined}
      aria-label={title}
    >
      <span className={emojiBadgeClass(pathname, item.href, isUpload)}>
        <span className={TAB_EMOJI_CLASS} aria-hidden>
          {emoji}
        </span>
      </span>
      <span className={tabLabelClass(pathname, item.href)} title={title}>
        {label}
      </span>
    </Link>
  );
}

export function PlayerMobileBottomNav() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const { pending: quizPending } = useDailyQuizStatus();
  const { user } = useNavSession();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(() => playerBottomNavPageIndex(pathname));
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  const scrollToPage = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    if (width <= 0) return;
    track.scrollTo({ left: index * width, behavior });
    setActivePage(index);
  }, []);

  useEffect(() => {
    const page = playerBottomNavPageIndex(pathname);
    setActivePage(page);
    scrollToPage(page, "instant");
  }, [pathname, scrollToPage]);

  useEffect(() => {
    if (!user?.id) {
      setProfileAvatarUrl(null);
      setUserDisplayName(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("users")
      .select("avatar_url,scout_apply_full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const url = typeof data?.avatar_url === "string" ? data.avatar_url.trim() : "";
        const name =
          typeof data?.scout_apply_full_name === "string"
            ? data.scout_apply_full_name.trim()
            : "";
        setProfileAvatarUrl(url || null);
        setUserDisplayName(name || user.email?.split("@")[0] || null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const width = track.clientWidth;
      if (width <= 0) return;
      const page = Math.round(track.scrollLeft / width);
      setActivePage(Math.min(APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES.length - 1, Math.max(0, page)));
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      data-app-bottom-nav
      data-player-bottom-nav-carousel
      className={`${APP_MOBILE_BOTTOM_NAV_CLASS} pointer-events-auto`}
      aria-label={tNav("primary")}
    >
      <div ref={trackRef} className={APP_MOBILE_BOTTOM_NAV_CAROUSEL_TRACK_CLASS}>
        {APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES.map((page, pageIndex) => (
          <div
            key={`bottom-nav-page-${pageIndex}`}
            className={APP_MOBILE_BOTTOM_NAV_PAGE_CLASS}
            aria-label={`${tNav("primary")} ${pageIndex + 1}`}
          >
            {page.map((item) => (
              <NavTab
                key={`${item.labelKey}-${item.href}`}
                item={item}
                pathname={pathname}
                quizPending={quizPending}
                profileAvatarUrl={profileAvatarUrl}
                userDisplayName={userDisplayName}
              />
            ))}
          </div>
        ))}
      </div>
      <div className={APP_MOBILE_BOTTOM_NAV_PAGER_CLASS} aria-hidden>
        {APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES.map((_, index) => (
          <button
            key={`pager-${index}`}
            type="button"
            tabIndex={-1}
            aria-label={`${index + 1}`}
            onClick={() => scrollToPage(index)}
            className={[
              "h-1.5 rounded-full transition-all duration-200",
              activePage === index ? "w-4 bg-gn-accent" : "w-1.5 bg-gn-text-tertiary/50",
            ].join(" ")}
          />
        ))}
      </div>
    </nav>
  );
}
