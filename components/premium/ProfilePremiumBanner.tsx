"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePremium } from "@/components/premium/PremiumProvider";

export function ProfilePremiumBanner() {
  const t = useTranslations("premium");
  const { isPremium, premiumLoaded } = usePremium();

  if (!premiumLoaded) {
    return null;
  }

  if (isPremium) {
    return (
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-xl border border-gn-accent/35 bg-gn-accent/10 px-3 py-2">
        <span className="shrink-0 rounded-full bg-gn-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
          {t("badgePremium")}
        </span>
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-gn-text">
          {t("profileYouArePremium")}
        </span>
      </div>
    );
  }

  return (
    <Link
      href="/premium"
      className="inline-flex max-w-full min-w-0 items-center rounded-xl border border-gn-border-subtle bg-gn-surface/50 px-4 py-2 text-sm font-semibold text-gn-accent transition-colors hover:border-gn-accent/40 hover:bg-gn-accent/10"
    >
      <span className="break-words">{t("profileUpgradeCta")}</span>
    </Link>
  );
}
