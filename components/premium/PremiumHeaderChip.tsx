"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePremium } from "@/components/premium/PremiumProvider";

export function PremiumHeaderChip() {
  const t = useTranslations("premium");
  const { isPremium, premiumLoaded } = usePremium();

  if (!premiumLoaded) {
    return (
      <span className="hidden h-8 w-16 shrink-0 animate-pulse rounded-lg bg-gn-surface-elevated/50 sm:block" />
    );
  }

  if (isPremium) {
    return (
      <span className="hidden shrink-0 rounded-full bg-gn-accent/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black sm:inline-flex sm:items-center">
        {t("badgeShort")}
      </span>
    );
  }

  return (
    <Link
      href="/premium"
      className="hidden shrink-0 rounded-lg border border-gn-accent/40 bg-gn-accent/10 px-2.5 py-1.5 text-xs font-semibold text-gn-accent transition-colors hover:bg-gn-accent/20 sm:inline-flex sm:items-center"
    >
      {t("headerUpgradeCta")}
    </Link>
  );
}
