"use client";

import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { NavUserMenu } from "@/components/layout/NavUserMenu";
import { useNavSession } from "@/components/layout/useNavSession";

/** Slim header for flows that should not show full app navigation (e.g. onboarding). */
export function MinimalAppHeader() {
  const { authed, user } = useNavSession();

  return (
    <header className="sticky top-0 z-50 border-b border-gn-border-subtle bg-gn-bg/80 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-gn-bg/65">
      <div className="mx-auto flex h-[3.75rem] min-w-0 max-w-6xl items-center justify-between gap-3 px-3 sm:gap-4 sm:px-6">
        <Logo href="/home" variant="header" className="shrink-0" />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {authed && user ? <NavUserMenu user={user} /> : null}
        </div>
      </div>
    </header>
  );
}
