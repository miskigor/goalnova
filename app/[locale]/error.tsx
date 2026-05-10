"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";

/**
 * Catches errors under `[locale]` when no closer `error.tsx` handles them.
 * Mobile browsers’ automatic translation (e.g. Google) mutates the DOM and often
 * crashes React — `translate="no"` on `<html>` reduces that; this screen explains it.
 */
export default function LocaleSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tCommon = useTranslations("authCommon");
  const tNotFound = useTranslations("notFound");
  const tLocaleErr = useTranslations("localeSegmentError");
  const tAppErr = useTranslations("appSectionError");

  useEffect(() => {
    console.error("[PitchRusch locale segment error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gn-bg px-6 py-16 text-center">
      <p className="max-w-md text-lg font-semibold text-gn-text">
        {tCommon("genericError")}
      </p>
      <p className="max-w-md text-sm leading-relaxed text-gn-text-secondary">
        {tLocaleErr("translateHint")}
      </p>
      {error.digest ? (
        <p className="max-w-md font-mono text-xs text-gn-text-tertiary">
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className={GN_PRIMARY_BUTTON_CLASS}>
          {tCommon("tryAgain")}
        </button>
        <Link href="/" className={GN_SECONDARY_BUTTON_CLASS}>
          {tNotFound("cta")}
        </Link>
        <Link href="/login" className={GN_SECONDARY_BUTTON_CLASS}>
          {tAppErr("signIn")}
        </Link>
      </div>
    </div>
  );
}
