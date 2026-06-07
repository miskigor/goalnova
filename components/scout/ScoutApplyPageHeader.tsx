"use client";

import { useTranslations } from "next-intl";
import {
  SCOUT_MOBILE_PAGE_SUBTITLE_CLASS,
  SCOUT_MOBILE_PAGE_TITLE_CLASS,
} from "@/components/scout/scoutMobileTypography";
import { ScoutMobileLayoutCheck } from "@/components/scout/ScoutMobileLayoutCheck";

export function ScoutApplyPageHeader() {
  const t = useTranslations("scoutVerification");

  return (
    <>
      <ScoutMobileLayoutCheck />
      <header className="min-w-0 max-w-full">
        <h1 className={SCOUT_MOBILE_PAGE_TITLE_CLASS}>{t("pageTitle")}</h1>
        <p className={SCOUT_MOBILE_PAGE_SUBTITLE_CLASS}>{t("pageSubtitle")}</p>
      </header>
    </>
  );
}
