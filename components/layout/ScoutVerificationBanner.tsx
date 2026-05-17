"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useScoutVerification } from "@/hooks/useScoutVerification";

/**
 * Reminds unverified scouts to complete verification (mobile + desktop).
 */
export function ScoutVerificationBanner() {
  const tNav = useTranslations("nav");
  const { loaded, row, isUnverifiedScout } = useScoutVerification();

  if (!loaded || !isUnverifiedScout || row?.role !== "scout") return null;

  return (
    <div
      className="mb-4 rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
      role="status"
    >
      <p className="text-sm text-amber-50/95">{tNav("scoutVerificationBanner")}</p>
      <Link
        href="/scout-apply"
        className="mt-3 inline-flex shrink-0 items-center justify-center rounded-lg bg-gn-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:mt-0"
      >
        {tNav("scoutVerificationCta")}
      </Link>
    </div>
  );
}
