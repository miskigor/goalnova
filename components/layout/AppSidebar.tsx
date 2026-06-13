"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { InlineLogoutButton } from "@/components/auth/InlineLogoutButton";
import { Logo } from "@/components/brand/Logo";
import { NavIcon } from "@/components/icons/NavIcons";
import {
  APP_SHELL_MAIN_NAV,
  APP_SHELL_SCOUT_MAIN_NAV_APPROVED,
  APP_SHELL_SCOUT_MAIN_NAV_UNVERIFIED,
  type ScoutShellNavItem,
} from "@/lib/constants/navigation";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { HeaderNotificationsLink } from "@/components/notifications/HeaderNotificationsLink";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import { useNavSession } from "@/components/layout/useNavSession";
import { useVideoUploadEligibility } from "@/hooks/useVideoUploadEligibility";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";
import { supabase } from "@/lib/supabase/client";
import { useAdminSupportUnread } from "@/components/layout/AdminSupportUnreadContext";
import {
  SIDEBAR_PLAYER_UPLOAD_ACTIVE_CLASS,
  SIDEBAR_PLAYER_UPLOAD_CLASS,
} from "@/components/layout/sidebarUploadStyles";
import { countMyUnreadSupportReplies } from "@/lib/supabase/supportTickets";
import { useDailyQuizStatus } from "@/hooks/useDailyQuizStatus";
import { challengesNavHref } from "@/lib/quiz/dailyQuizNav";
import { DailyQuizPendingDot } from "@/components/quiz/DailyQuizPendingDot";

function sidebarLinkClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "bg-gn-accent/15 text-gn-accent ring-1 ring-gn-accent/35"
      : "text-gn-text-secondary hover:bg-white/[0.06] hover:text-gn-text motion-safe:hover:translate-x-0.5 rtl:motion-safe:hover:-translate-x-0.5",
  ].join(" ");
}

const SIDEBAR_SHELL_CLASS =
  "fixed inset-y-0 start-0 z-40 hidden w-[15.5rem] flex-col border-e border-gn-border-subtle bg-gn-bg/95 shadow-[4px_0_32px_rgba(0,0,0,0.2)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90 lg:flex";

export function AppSidebar() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tQuiz = useTranslations("dailyQuiz");
  const tSettings = useTranslations("settings");
  const [hydrated, setHydrated] = useState(false);
  const { authed, user } = useNavSession();
  const { pending: quizPending } = useDailyQuizStatus();
  const uploadEligibility = useVideoUploadEligibility();
  const scoutGate = useScoutVerification();
  const { isApprovedScout, isUnverifiedScout } = scoutGate;
  const isScout = scoutGate.loaded && scoutGate.row?.role === "scout";
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const adminSupportUnread = useAdminSupportUnread();
  const [userSupportUnread, setUserSupportUnread] = useState(0);
  const showPlayerUpload = uploadEligibility === "player" && !isScout;
  const uploadActive = navItemActive(pathname, "/upload");
  const scoutMainNav: ScoutShellNavItem[] = isApprovedScout
    ? APP_SHELL_SCOUT_MAIN_NAV_APPROVED
    : APP_SHELL_SCOUT_MAIN_NAV_UNVERIFIED;
  const logoHref = isScout
    ? isApprovedScout
      ? "/scout-dashboard"
      : "/scout-apply"
    : "/home";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!authed || !user || isAdmin) {
      setUserSupportUnread(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const { count } = await countMyUnreadSupportReplies();
      if (!cancelled) setUserSupportUnread(count);
    };
    void refresh();
    const ch = supabase
      .channel(`user-support-unread-sidebar-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_ticket_messages" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [authed, user, isAdmin]);

  if (!hydrated) {
    return (
      <aside
        className={SIDEBAR_SHELL_CLASS}
        aria-label={tNav("sections")}
        suppressHydrationWarning
      >
        <div className="flex h-16 shrink-0 items-center border-b border-gn-border-subtle px-4">
          <Logo href="/home" variant="header" className="min-w-0" />
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3"
          aria-label={tNav("primary")}
        >
          {APP_SHELL_MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={sidebarLinkClass(pathname, item.href)}
              aria-current={navItemActive(pathname, item.href) ? "page" : undefined}
            >
              <NavIcon
                name={item.icon}
                className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
              />
              <span className="min-w-0 truncate">{tNav(item.labelKey)}</span>
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-gn-border-subtle p-3">
          <div className="h-10 animate-pulse rounded-xl bg-gn-surface/40" />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={SIDEBAR_SHELL_CLASS}
      aria-label={tNav("sections")}
      suppressHydrationWarning
    >
      <div className="flex h-16 shrink-0 items-center border-b border-gn-border-subtle px-4">
        <Logo href={logoHref} variant="header" className="min-w-0" />
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3"
        aria-label={tNav("primary")}
      >
        {isUnverifiedScout ? (
          <Link
            href="/scout-apply"
            className={[
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-[color,background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
              navItemActive(pathname, "/scout-apply")
                ? "bg-gn-accent text-black ring-1 ring-gn-accent/50"
                : "bg-gn-accent/90 text-black hover:bg-gn-accent motion-safe:hover:translate-x-0.5 rtl:motion-safe:hover:-translate-x-0.5",
            ].join(" ")}
            aria-current={navItemActive(pathname, "/scout-apply") ? "page" : undefined}
          >
            <NavIcon name="scoutDashboard" className="size-5 shrink-0 text-black" />
            <span className="min-w-0 truncate">{tNav("scoutVerificationCta")}</span>
          </Link>
        ) : null}

        {(isScout ? scoutMainNav : APP_SHELL_MAIN_NAV).map((item) => {
          if (item.href === "/notifications") {
            return (
              <HeaderNotificationsLink key={item.href} layout="sidebar" />
            );
          }
          const challengesHref =
            item.href === "/challenges" && quizPending
              ? challengesNavHref(true)
              : item.href;
          const challengesTitle =
            item.href === "/challenges" && quizPending
              ? `${tNav(item.labelKey)} — ${tQuiz("navPendingHint")}`
              : tNav(item.labelKey);
          return (
            <Link
              key={item.href}
              href={challengesHref}
              className={sidebarLinkClass(pathname, item.href)}
              aria-current={
                navItemActive(pathname, item.href) ? "page" : undefined
              }
              aria-label={challengesTitle}
              title={challengesTitle}
            >
              <span className="relative inline-flex shrink-0">
                <NavIcon
                  name={item.icon}
                  className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
                />
                {item.href === "/challenges" && quizPending ? (
                  <DailyQuizPendingDot variant="bottomNav" />
                ) : null}
              </span>
              <span className="min-w-0 truncate">{tNav(item.labelKey)}</span>
            </Link>
          );
        })}

        {isUnverifiedScout ? (
          <Link
            href="/discover"
            className={sidebarLinkClass(pathname, "/discover")}
            aria-current={navItemActive(pathname, "/discover") ? "page" : undefined}
          >
            <NavIcon
              name="discover"
              className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
            />
            <span className="min-w-0 truncate">{tNav("discover")}</span>
          </Link>
        ) : null}
      </nav>

      <div className="space-y-2 border-t border-gn-border-subtle p-3">
        {showPlayerUpload ? (
          <Link
            href="/upload"
            className={`${SIDEBAR_PLAYER_UPLOAD_CLASS} ${uploadActive ? SIDEBAR_PLAYER_UPLOAD_ACTIVE_CLASS : ""}`.trim()}
            aria-current={uploadActive ? "page" : undefined}
          >
            <NavIcon name="upload" className="size-5 shrink-0 text-black" />
            <span className="min-w-0 truncate">{tNav("upload")}</span>
          </Link>
        ) : null}

        {adminLoaded && isAdmin ? (
          <Link
            href="/admin"
            className={[
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
              navItemActive(pathname, "/admin")
                ? "bg-gn-accent/15 text-gn-accent ring-1 ring-gn-accent/35"
                : "text-gn-text-secondary hover:bg-white/[0.06] hover:text-gn-text motion-safe:hover:translate-x-0.5 rtl:motion-safe:hover:-translate-x-0.5",
            ].join(" ")}
            aria-current={navItemActive(pathname, "/admin") ? "page" : undefined}
            aria-label={
              adminSupportUnread > 0
                ? `${tNav("adminPanel")}, ${adminSupportUnread} unread`
                : tNav("adminPanel")
            }
          >
            <span className="relative inline-flex shrink-0">
              <NavIcon
                name="settings"
                className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
              />
              <UnreadNotificationBadge count={adminSupportUnread} variant="navSidebar" />
            </span>
            <span className="truncate">{tNav("adminPanel")}</span>
          </Link>
        ) : null}

        <Link
          href="/support"
          className={[
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
            navItemActive(pathname, "/support")
              ? "bg-gn-accent/15 text-gn-accent ring-1 ring-gn-accent/35"
              : "text-gn-text-secondary hover:bg-white/[0.06] hover:text-gn-text motion-safe:hover:translate-x-0.5 rtl:motion-safe:hover:-translate-x-0.5",
          ].join(" ")}
          aria-current={navItemActive(pathname, "/support") ? "page" : undefined}
        >
          <span className="relative inline-flex shrink-0">
            <NavIcon
              name="settings"
              className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
            />
            <UnreadNotificationBadge
              count={isAdmin ? 0 : userSupportUnread}
              variant="navSidebar"
            />
          </span>
          <span className="truncate">{tSettings("support")}</span>
        </Link>

        <div className="space-y-2 px-0.5">
          <LanguageSwitcher className="w-full [&_select]:w-full" />
          {authed && user ? <InlineLogoutButton /> : null}
        </div>

        {authed && user ? (
          <div className="flex justify-center pt-1">
            <NavUserMenu user={user} menuPlacement="above" />
          </div>
        ) : authed === null ? (
          <div className="h-10 animate-pulse rounded-xl bg-gn-surface/40" />
        ) : null}
      </div>
    </aside>
  );
}
