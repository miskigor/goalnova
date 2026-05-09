"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import { useNavSession } from "@/components/layout/useNavSession";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  const tNav = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="mx-auto flex h-14 w-full min-w-0 max-w-lg items-center justify-between gap-2 px-3 sm:gap-3 sm:px-5 md:max-w-2xl">
          <div className="min-w-0 shrink ps-1">
            <Logo href="/home" variant="header" className="min-w-0 shrink" />
          </div>
          <Link
            href="/premium"
            className="inline-flex min-w-0 shrink items-center gap-1.5 rounded-xl border border-gn-accent/35 bg-gn-accent/10 px-2.5 py-1.5 text-xs font-semibold tracking-tight text-gn-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] active:scale-[0.98]"
            aria-label={tNav("premium")}
          >
            <NavIcon name="premium" className="size-[18px] shrink-0" />
            <span className="truncate">{tNav("premium")}</span>
          </Link>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
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
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-gn-accent/40 bg-gn-accent/10 px-2.5 text-xs font-semibold text-gn-accent active:scale-[0.98]"
                aria-label={tNav("adminPanel")}
              >
                {tNav("admin")}
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
              <div className="mb-1 flex items-center justify-between gap-3 rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-3 py-2">
                <Link
                  href="/profile"
                  className="text-sm font-semibold text-gn-text hover:text-gn-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tNav("profile")}
                </Link>
                <Link
                  href="/home"
                  className="text-sm font-semibold text-gn-text hover:text-gn-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tNav("home")}
                </Link>
              </div>
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
