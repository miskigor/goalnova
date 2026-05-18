"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useScoutVerification } from "@/hooks/useScoutVerification";
import { navItemActive } from "@/lib/navigation/navItemActive";

/**
 * Reminds unverified scouts to complete verification (mobile + desktop).
 * Hidden on `/scout-apply` — user is already on the verification flow.
 */
export function ScoutVerificationBanner() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const { loaded, row, isUnverifiedScout } = useScoutVerification();

  if (
    !loaded ||
    !isUnverifiedScout ||
    row?.role !== "scout" ||
    navItemActive(pathname, "/scout-apply")
  ) {
    return null;
  }

  return (
    <div
      className="mb-4 box-border flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-clip rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      role="status"
    >
      <p className="min-w-0 flex-1 break-words text-sm text-amber-50/95">
        {tNav("scoutVerificationBanner")}
      </p>
      <Link
        href="/scout-apply"
        className="flex w-full min-w-0 shrink-0 items-center justify-center truncate rounded-lg bg-gn-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:w-auto sm:max-w-[14rem]"
      >
        {tNav("scoutVerificationCta")}
      </Link>
    </div>
  );
}
