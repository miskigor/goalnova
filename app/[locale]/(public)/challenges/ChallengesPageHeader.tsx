"use client";

import { useTranslations } from "next-intl";

export function ChallengesPageHeader() {
  const t = useTranslations("challenges");

  return (
    <header className="mb-8 space-y-1">
      <h1 className="text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl">
        {t("title")}
      </h1>
      <p className="text-sm text-gn-text-secondary">{t("subtitle")}</p>
    </header>
  );
}
