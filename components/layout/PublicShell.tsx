"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Logo } from "@/components/brand/Logo";
import { NavIcon } from "@/components/icons/NavIcons";
import { PublicTopNav } from "@/components/layout/PublicTopNav";
import { AppChromeLayout } from "@/components/layout/AppChromeLayout";
import { AppShellDebugOverlay } from "@/components/layout/AppShellDebugOverlay";
import { useNavSession } from "@/components/layout/useNavSession";
import { hasPersistedSupabaseSession } from "@/lib/auth/hasPersistedSupabaseSession";
import { navItemActive } from "@/lib/navigation/navItemActive";

function sidebarLinkClass(pathname: string, href: string) {
  const active = navItemActive(pathname, href);
  return [
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors",
    active
      ? "bg-gn-accent/15 text-gn-accent ring-1 ring-gn-accent/35"
      : "text-gn-text-secondary hover:bg-white/[0.06] hover:text-gn-text motion-safe:hover:translate-x-0.5 rtl:motion-safe:hover:-translate-x-0.5",
  ].join(" ");
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { authed } = useNavSession();
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tExplore = useTranslations("explore");

  if (authed) {
    return <AppChromeLayout>{children}</AppChromeLayout>;
  }

  if (authed === null && hasPersistedSupabaseSession()) {
    return <AppChromeLayout>{children}</AppChromeLayout>;
  }

  return (
    <>
      <AppShellDebugOverlay />
      <div
        data-public-shell
        className="flex min-h-dvh min-w-0 w-full overflow-x-clip bg-gn-bg text-gn-text"
      >
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[15.5rem] flex-col border-e border-gn-border-subtle bg-gn-bg/95 shadow-[4px_0_32px_rgba(0,0,0,0.2)] backdrop-blur-xl supports-[backdrop-filter]:bg-gn-bg/90 lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-gn-border-subtle px-4">
          <Logo href="/explore" variant="header" className="min-w-0" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3" aria-label={tNav("primary")}>
          <Link
            href="/explore"
            className={sidebarLinkClass(pathname, "/explore")}
            aria-current={navItemActive(pathname, "/explore") ? "page" : undefined}
          >
            <NavIcon
              name="explore"
              className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
            />
            {tNav("explore")}
          </Link>
          <Link
            href="/rankings"
            className={sidebarLinkClass(pathname, "/rankings")}
            aria-current={navItemActive(pathname, "/rankings") ? "page" : undefined}
          >
            <NavIcon
              name="rankings"
              className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
            />
            {tNav("rankings")}
          </Link>
          <Link
            href="/login"
            className={sidebarLinkClass(pathname, "/login")}
            aria-current={navItemActive(pathname, "/login") ? "page" : undefined}
          >
            <NavIcon
              name="settings"
              className="size-5 shrink-0 transition-transform duration-300 ease-gn-smooth motion-safe:group-hover:scale-110"
            />
            {tExplore("navLogin")}
          </Link>
        </nav>
        <div className="space-y-2 border-t border-gn-border-subtle p-3">
          <Link
            href="/signup"
            className={`flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-[background-color,box-shadow,transform] duration-300 ease-gn-smooth motion-reduce:transition-colors ${
              navItemActive(pathname, "/signup")
                ? "bg-gn-accent text-gn-bg shadow-[0_0_24px_-4px_rgba(249,115,22,0.55)]"
                : "bg-gn-accent text-gn-bg shadow-[0_8px_28px_-10px_rgba(249,115,22,0.45)] hover:bg-gn-accent-hover hover:shadow-[0_12px_36px_-8px_rgba(249,115,22,0.55)] motion-safe:active:scale-[0.99]"
            }`}
            aria-current={navItemActive(pathname, "/signup") ? "page" : undefined}
          >
            <NavIcon name="profile" className="size-5 shrink-0 text-black" />
            {tExplore("navSignUp")}
          </Link>
          <LanguageSwitcher className="w-full [&_select]:w-full" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ps-[15.5rem]">
        <header className="sticky top-0 z-50 border-b border-gn-border-subtle bg-gn-bg/75 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow,border-color] duration-300 ease-gn-smooth supports-[backdrop-filter]:bg-gn-bg/58 lg:hidden">
          <div className="mx-auto flex h-[3.75rem] min-w-0 max-w-6xl items-center pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6">
            <PublicTopNav trailing={<LanguageSwitcher />} />
          </div>
        </header>
        <div className="mx-auto min-w-0 w-full max-w-6xl flex-1 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6">
          {children}
        </div>
      </div>
      </div>
    </>
  );
}
