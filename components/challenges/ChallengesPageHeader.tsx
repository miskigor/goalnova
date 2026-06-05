"use client";

import { useTranslations } from "next-intl";

export function ChallengesPageHeader() {
  const t = useTranslations("challenges");

  return (
    <header className="box-border min-w-0 max-w-full space-y-1 overflow-x-clip border-b border-gn-border-subtle pb-4">
      <h1
        id="challenges-page-title"
        className="break-words text-xl font-bold tracking-tight text-gn-text sm:text-2xl lg:text-3xl"
      >
        {t("title")}
      </h1>
      <p className="text-xs text-gn-text-secondary sm:text-sm">{t("subtitle")}</p>
    </header>
  );
}
