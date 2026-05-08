"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GN_PRIMARY_BUTTON_CLASS, GN_SECONDARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

/**
 * Catches runtime errors in authenticated app routes (home, profile, …).
 * Without this, the browser may show a generic “This page couldn’t load” sheet.
 */
export default function AppSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("appSectionError");
  const tAuth = useTranslations("authCommon");

  useEffect(() => {
    console.error("[PitchRusch app error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-lg font-semibold text-gn-text">{t("title")}</p>
      <p className="text-sm text-gn-text-secondary">{t("description")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={() => reset()} className={GN_PRIMARY_BUTTON_CLASS}>
          {tAuth("tryAgain")}
        </button>
        <Link href="/home" className={GN_SECONDARY_BUTTON_CLASS}>
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
