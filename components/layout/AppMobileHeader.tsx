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

/**
 * Fixed top bar on small screens: brand + compact actions (admin, benefits, account menu).
 * Premium lives in the bottom nav; “More” links live in {@link NavUserMenu} when `mobileMoreInMenu`.
 */
export function AppMobileHeader() {
  const { authed, user } = useNavSession();
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const adminSupportUnread = useAdminSupportUnread();
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const benefitsActive = navItemActive(pathname, "/benefits");
  const adminActive = navItemActive(pathname, "/admin");

  return (
    <header className="fixed left-0 right-0 top-0 z-[55] shrink-0 overflow-x-clip border-b border-gn-border-subtle bg-gn-bg/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90 lg:hidden">
      <div className="mx-auto flex h-14 w-full min-w-0 max-w-full items-center gap-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))]">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          <Logo href="/home" variant="header" className="min-w-0 max-w-full" />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {authed && user && adminLoaded && isAdmin ? (
            <Link
              href="/admin"
              className={
                "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg border text-gn-accent transition active:scale-[0.98] hover:bg-gn-accent/15 " +
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
              href="/benefits"
              className={
                "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border text-gn-text-secondary transition active:scale-[0.98] hover:bg-gn-surface-elevated hover:text-gn-text " +
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
