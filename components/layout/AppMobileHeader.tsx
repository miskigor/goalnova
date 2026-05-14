"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import { useNavSession } from "@/components/layout/useNavSession";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminSupportUnread } from "@/components/layout/AdminSupportUnreadContext";
import { UnreadNotificationBadge } from "@/components/notifications/UnreadNotificationBadge";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { navItemActive } from "@/lib/navigation/navItemActive";
import { InlineLogoutButton } from "@/components/auth/InlineLogoutButton";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { NavIcon } from "@/components/icons/NavIcons";

/**
 * Fixed top bar on small screens so account menu (profile, settings, logout) is always reachable.
 * Desktop uses {@link AppSidebar} footer for the same menu.
 */
export function AppMobileHeader() {
  const { authed, user } = useNavSession();
  const { loaded: adminLoaded, isAdmin } = useAdminAccess();
  const adminSupportUnread = useAdminSupportUnread();
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const benefitsActive = navItemActive(pathname, "/benefits");

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[45] shrink-0 overflow-x-clip border-b border-gn-border-subtle bg-gn-bg/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90 lg:hidden">
        <div className="mx-auto flex h-14 w-full min-w-0 max-w-lg items-center justify-between gap-1 sm:gap-3 md:max-w-2xl pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:pl-[max(1.25rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.25rem,env(safe-area-inset-right,0px))]">
          <Logo href="/home" variant="header" className="min-w-0 shrink" />
          <Link
            href="/premium"
            className="inline-flex min-w-0 shrink items-center gap-1.5 rounded-xl border border-gn-accent/35 bg-gn-accent/10 px-2.5 py-1.5 text-xs font-semibold tracking-tight text-gn-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.98]"
            aria-label={tNav("premium")}
          >
            <NavIcon name="premium" className="size-[18px] shrink-0" />
            <span className="truncate">{tNav("premium")}</span>
          </Link>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
            {authed && user ? (
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-gn-border-subtle bg-gn-surface/30 text-gn-text-secondary transition hover:bg-gn-surface-elevated hover:text-gn-text"
                aria-label={mobileMenuOpen ? tNav("closeMainNav") : tNav("openMainNav")}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  {mobileMenuOpen ? (
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  ) : (
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            ) : null}
            {authed && user && adminLoaded && isAdmin ? (
              <Link
                href="/admin"
                className="relative inline-flex min-h-9 min-w-0 max-w-[8.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-gn-accent/40 bg-gn-accent/10 px-2.5 py-1 text-center text-xs font-semibold leading-tight text-gn-accent active:scale-[0.98] sm:max-w-none"
                aria-label={
                  adminSupportUnread > 0
                    ? `${tNav("adminPanel")}, ${adminSupportUnread} unread`
                    : tNav("adminPanel")
                }
              >
                <span className="relative inline-flex shrink-0 items-center justify-center">
                  <UnreadNotificationBadge count={adminSupportUnread} variant="navCompact" />
                  <span>{tNav("admin")}</span>
                </span>
                {adminSupportUnread > 0 ? (
                  <span className="max-w-full truncate text-[9px] font-medium normal-case text-gn-accent/95">
                    {tNav("adminUnreadShort", { count: adminSupportUnread })}
                  </span>
                ) : null}
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
              <NavUserMenu user={user} menuPlacement="below" />
            ) : authed === null ? (
              <div className="size-9 animate-pulse rounded-full bg-gn-surface/50" />
            ) : null}
          </div>
        </div>
      </header>

      {mobileMenuOpen && authed && user ? (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={tNav("closeMainNav")}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute end-0 top-0 h-full w-[min(88vw,20rem)] border-s border-gn-border-subtle bg-gn-bg/95 p-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] shadow-[-16px_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gn-text-tertiary">
                {tNav("primary")}
              </p>
              <button
                type="button"
                className="rounded-lg p-2 text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                aria-label={tNav("closeMainNav")}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gn-text-tertiary">
                {tNav("moreInMenu")}
              </p>
              <Link
                href="/benefits"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("myBenefits")}
              </Link>
              <Link
                href="/explore"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("explore")}
              </Link>
              <Link
                href="/rankings"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("rankings")}
              </Link>
              <Link
                href="/notifications"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("messages")}
              </Link>
              <Link
                href="/profile"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("profile")}
              </Link>
              <Link
                href="/settings"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("settings")}
              </Link>
              <Link
                href="/support"
                className="block rounded-xl px-3 py-2.5 text-sm text-gn-text-secondary hover:bg-gn-surface-elevated hover:text-gn-text"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tNav("support")}
              </Link>
            </nav>
            <div className="mt-4 border-t border-gn-border-subtle pt-4">
              <LanguageSwitcher className="w-full [&_select]:w-full" />
            </div>
            <div className="mt-3">
              <InlineLogoutButton />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
