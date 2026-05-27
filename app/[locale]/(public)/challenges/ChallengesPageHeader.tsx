"use client";

import { useTranslations } from "next-intl";

export function ChallengesPageHeader() {
  const t = useTranslations("challenges");

  return (
    <header className="box-border min-w-0 w-full max-w-full space-y-1 overflow-x-clip mb-8 max-lg:mb-6">
      <h1 className="break-words text-xl font-bold tracking-tight text-gn-text max-lg:text-base sm:text-2xl lg:text-3xl">
        {t("title")}
      </h1>
      <p className="break-words text-sm text-gn-text-secondary">{t("subtitle")}</p>
    </header>
  );
}
