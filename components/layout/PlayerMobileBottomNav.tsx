"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";
import { useNotificationsInbox } from "@/components/notifications/NotificationsInboxContext";
import { useNavSession } from "@/components/layout/useNavSession";
import { supabase } from "@/lib/supabase/client";
import type { ShellMobileNavItem } from "@/lib/constants/navigation";
import {
  APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES,
  playerBottomNavPageIndex,
} from "@/lib/constants/playerMobileBottomNav";
import { navItemActive } from "@/lib/navigation/navItemActive";
import {
  APP_MOBILE_BOTTOM_NAV_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_ACTIVE_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_INACTIVE_CLASS,
  APP_MOBILE_BOTTOM_NAV_EMOJI_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGE_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGER_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGER_DOT_ACTIVE_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGER_DOT_CLASS,
  APP_MOBILE_BOTTOM_NAV_PAGER_DOT_INACTIVE_CLASS,
  APP_MOBILE_BOTTOM_NAV_PLAYER_CLASS,
  APP_MOBILE_BOTTOM_NAV_TAB_LABEL_CLASS,
  APP_MOBILE_BOTTOM_NAV_TAB_LINK_CLASS,
  APP_MOBILE_BOTTOM_NAV_TRACK_CLASS,
  APP_MOBILE_BOTTOM_NAV_UPLOAD_BUTTON_CLASS,
} from "@/lib/layout/appShellClasses";
import { mobileBottomNavDisplayLabel } from "@/lib/layout/mobileBottomNavLabel";
import { useDailyQuizStatus } from "@/hooks/useDailyQuizStatus";
import { challengesNavHref } from "@/lib/quiz/dailyQuizNav";
import "@/components/layout/playerBottomNavCarousel.css";

const PAGE_COUNT = APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES.length;
const SWIPE_THRESHOLD_PX = 36;

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
  // Messages: keep 💬 on a neutral circle; active state is label color only.
  if (href === "/messages") {
    return [
      APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_CLASS,
      APP_MOBILE_BOTTOM_NAV_EMOJI_BADGE_INACTIVE_CLASS,
      "overflow-visible",
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

function clampPage(index: number): number {
  return Math.min(PAGE_COUNT - 1, Math.max(0, index));
}

type NavTabProps = {
  item: ShellMobileNavItem;
  pathname: string;
  quizPending: boolean;
  profileAvatarUrl: string | null;
  userDisplayName: string | null;
  dmUnreadCount: number;
};

function NavTab({
  item,
  pathname,
  quizPending,
  profileAvatarUrl,
  userDisplayName,
  dmUnreadCount,
}: NavTabProps) {
  const tNav = useTranslations("nav");
  const tQuiz = useTranslations("dailyQuiz");
  const tMessages = useTranslations("messages");

  const label = mobileBottomNavDisplayLabel(tNav(item.labelKey));
  const href =
    item.href === "/challenges" && quizPending
      ? challengesNavHref(true)
      : item.href;
  const active = navItemActive(pathname, item.href);
  const isMessagesTab = item.href === "/messages";
  const title =
    item.href === "/challenges" && quizPending
      ? `${tNav(item.labelKey)} — ${tQuiz("navPendingHint")}`
      : isMessagesTab && dmUnreadCount > 0
        ? tMessages("inboxLinkAriaUnread", { count: dmUnreadCount })
        : tNav(item.labelKey);
  const itemKey = `${item.labelKey}-${item.href}`;
  const emoji = TAB_EMOJI[item.href] ?? "•";
  const isUpload = item.href === "/upload";

  if (item.href === "/profile" && profileAvatarUrl) {
    return (
      <Link
        key={itemKey}
        href={item.href}
        data-player-bottom-nav-tab
        className={APP_MOBILE_BOTTOM_NAV_TAB_LINK_CLASS}
        aria-current={active ? "page" : undefined}
        aria-label={title}
      >
        <span
          data-tab-emoji-badge
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
        <span data-tab-label className={tabLabelClass(pathname, item.href)} title={title}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link
      key={itemKey}
      href={href}
      data-player-bottom-nav-tab
      className={[
        APP_MOBILE_BOTTOM_NAV_TAB_LINK_CLASS,
        isMessagesTab ? "relative overflow-visible" : "",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
      aria-label={title}
    >
      <span
        data-tab-emoji-badge
        data-messages-tab={isMessagesTab ? "true" : undefined}
        className={emojiBadgeClass(pathname, item.href, isUpload)}
      >
        <span className={TAB_EMOJI_CLASS} aria-hidden>
          {emoji}
        </span>
      </span>
      {isMessagesTab ? (
        <UnreadNotificationBadge count={dmUnreadCount} variant="bottomNav" />
      ) : null}
      <span data-tab-label className={tabLabelClass(pathname, item.href)} title={title}>
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
  const { unreadCount: dmUnreadCount } = useNotificationsInbox();
  const [viewPage, setViewPage] = useState(() => playerBottomNavPageIndex(pathname));
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);

  const goToPage = useCallback((index: number) => {
    setViewPage(clampPage(index));
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      suppressNextClickRef.current = false;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      const touch = e.changedTouches[0];
      if (!start || !touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

      suppressNextClickRef.current = true;
      e.preventDefault();
      setViewPage((prev) => clampPage(prev + (dx < 0 ? 1 : -1)));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const onNavClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressNextClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    suppressNextClickRef.current = false;
  }, []);

  useEffect(() => {
    goToPage(playerBottomNavPageIndex(pathname));
  }, [pathname, goToPage]);

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

  const visibleItems = APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES[viewPage] ?? APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES[0];

  return (
    <nav
      ref={navRef}
      data-app-bottom-nav
      data-player-bottom-nav-carousel
      data-player-bottom-nav-view-page={viewPage}
      className={`${APP_MOBILE_BOTTOM_NAV_CLASS} ${APP_MOBILE_BOTTOM_NAV_PLAYER_CLASS} pointer-events-auto`}
      aria-label={tNav("primary")}
      onClickCapture={onNavClickCapture}
    >
      <div
        data-player-bottom-nav-track
        className={APP_MOBILE_BOTTOM_NAV_TRACK_CLASS}
      >
        <div
          data-player-bottom-nav-page
          className={APP_MOBILE_BOTTOM_NAV_PAGE_CLASS}
          aria-label={`${tNav("primary")} ${viewPage + 1}`}
        >
          {visibleItems.map((item) => (
            <NavTab
              key={`${item.labelKey}-${item.href}`}
              item={item}
              pathname={pathname}
              quizPending={quizPending}
              profileAvatarUrl={profileAvatarUrl}
              userDisplayName={userDisplayName}
              dmUnreadCount={dmUnreadCount}
            />
          ))}
        </div>
      </div>
      <div
        data-player-bottom-nav-pager
        className={APP_MOBILE_BOTTOM_NAV_PAGER_CLASS}
        role="tablist"
        aria-label={tNav("sections")}
      >
        {APP_SHELL_PLAYER_MOBILE_BOTTOM_NAV_PAGES.map((_, index) => (
          <button
            key={`pager-${index}`}
            type="button"
            role="tab"
            aria-selected={viewPage === index}
            data-pager-active={viewPage === index ? "true" : "false"}
            aria-label={`${index + 1}`}
            onClick={() => goToPage(index)}
            className={[
              APP_MOBILE_BOTTOM_NAV_PAGER_DOT_CLASS,
              viewPage === index
                ? APP_MOBILE_BOTTOM_NAV_PAGER_DOT_ACTIVE_CLASS
                : APP_MOBILE_BOTTOM_NAV_PAGER_DOT_INACTIVE_CLASS,
            ].join(" ")}
          />
        ))}
      </div>
    </nav>
  );
}
