"use client";

import { Logo } from "@/components/brand/Logo";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import { useNavSession } from "@/components/layout/useNavSession";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminSupportUnread } from "@/components/layout/AdminSupportUnreadContext";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { NavIcon } from "@/components/icons/NavIcons";
import { APP_MOBILE_HEADER_CLASS } from "@/lib/layout/appShellClasses";

/** Mobile-only header row layout (padding + alignment tuned here, not in shared shell constants). */
const MOBILE_HEADER_INNER_CLASS =
  "box-border flex h-14 w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-visible ps-[max(2.75rem,env(safe-area-inset-left,0px))] pe-[max(2.75rem,env(safe-area-inset-right,0px))]";

/**
 * Fixed top bar on small screens: brand + compact actions (admin, challenges, benefits, account menu).
 * Premium lives in the bottom nav; “More” links live in {@link NavUserMenu} when `mobileMoreInMenu`.
 */
export function AppMobileHeader() {
  const { authed, user } = useNavSession();
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const adminSupportUnread = useAdminSupportUnread();
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const benefitsActive = navItemActive(pathname, "/benefits");
  const challengesActive = navItemActive(pathname, "/challenges");
  const adminActive = navItemActive(pathname, "/admin");

  return (
    <header
      data-app-mobile-header
      className={`${APP_MOBILE_HEADER_CLASS} overflow-visible`}
    >
      <div className={MOBILE_HEADER_INNER_CLASS}>
        <Logo
          href="/home"
          variant="header"
          showWordmark={false}
          priority
          className="!shrink-0 [&_span]:overflow-visible [&_img]:!size-11 [&_img]:!max-h-11 [&_img]:!max-w-11 [&_img]:!object-contain"
        />

        <div className="flex shrink-0 items-center gap-1">
          {authed && user && adminLoaded && isAdmin ? (
            <Link
              href="/admin"
              className={
                "relative flex size-9 shrink-0 items-center justify-center overflow-visible rounded-lg border text-gn-accent transition active:scale-[0.98] hover:bg-gn-accent/15 " +
                (adminActive
                  ? "border-gn-accent/60 bg-gn-accent/15"
                  : "border-gn-accent/40 bg-gn-accent/10")
              }
              aria-label={
                adminSupportUnread > 0
                  ? `${tNav("adminPanel")}, ${adminSupportUnread} unread`
                  : tNav("adminPanel")
              }
              title={tNav("admin")}
            >
              <UnreadNotificationBadge count={adminSupportUnread} variant="navCompact" />
              <svg
                className="size-[18px] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </Link>
          ) : null}
          {authed && user ? (
            <Link
              href="/challenges"
              className={
                "flex h-8 min-w-0 max-w-[5.25rem] shrink items-center justify-center rounded-lg border px-1.5 text-[10px] font-semibold leading-tight tracking-tight text-gn-accent transition active:scale-[0.98] hover:bg-gn-accent/10 sm:max-w-[6.25rem] sm:px-2 sm:text-[11px] " +
                (challengesActive
                  ? "border-gn-accent bg-gn-accent/25"
                  : "border-gn-accent/55 bg-gn-surface/30")
              }
              aria-label={tNav("challenges")}
              title={tNav("challenges")}
              aria-current={challengesActive ? "page" : undefined}
            >
              <span className="min-w-0 truncate">{tNav("challenges")}</span>
            </Link>
          ) : null}
          {authed && user ? (
            <Link
              href="/benefits"
              className={
                "flex size-9 shrink-0 items-center justify-center rounded-lg border text-gn-text-secondary transition active:scale-[0.98] hover:bg-gn-surface-elevated hover:text-gn-text " +
                (benefitsActive
                  ? "border-gn-accent/45 bg-gn-accent/10 text-gn-accent"
                  : "border-gn-border-subtle bg-gn-surface/30")
              }
              aria-label={tNav("myBenefits")}
              title={tNav("myBenefits")}
            >
              <NavIcon name="benefits" className="size-[18px] shrink-0" />
            </Link>
          ) : null}
          {authed && user ? (
            <NavUserMenu
              user={user}
              menuPlacement="below"
              mobileMoreInMenu
              compactTrigger
            />
          ) : authed === null ? (
            <div className="size-9 shrink-0 animate-pulse rounded-full bg-gn-surface/50" />
          ) : null}
        </div>
      </div>
    </header>
  );
}
