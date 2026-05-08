"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";

/**
 * Catches errors under `[locale]` (onboarding, public, auth) when no closer
 * `error.tsx` handles them — avoids a blank tab / generic browser crash sheet
 * for recoverable React failures.
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

  useEffect(() => {
    console.error("[PitchRusch locale segment error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gn-bg px-6 py-16 text-center">
      <p className="max-w-md text-lg font-semibold text-gn-text">
        {tCommon("genericError")}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className={GN_PRIMARY_BUTTON_CLASS}>
          {tCommon("tryAgain")}
        </button>
        <Link href="/" className={GN_SECONDARY_BUTTON_CLASS}>
          {tNotFound("cta")}
        </Link>
      </div>
    </div>
  );
}
