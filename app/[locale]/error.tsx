"use client";

import { useEffect, useState } from "react";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";
import { browserLocalePrefixFromPathname } from "@/lib/i18n/browserLocalePrefix";

/**
 * Global error UI for `[locale]`. Intentionally does **not** use `next-intl` hooks: if the failure
 * happened around i18n/providers, `useTranslations` can throw and replace this screen with a blank tab.
 */
export default function LocaleSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [prefix, setPrefix] = useState("");

  useEffect(() => {
    setPrefix(browserLocalePrefixFromPathname(window.location.pathname));
  }, []);

  useEffect(() => {
    console.error("[PitchRusch locale segment error]", error);
  }, [error]);

  const homeHref = prefix || "/";
  const loginHref = prefix ? `${prefix}/login` : "/login";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gn-bg px-6 py-16 text-center">
      <p className="max-w-md text-lg font-semibold text-gn-text">
        Nešto je pošlo po krivu. Pokušaj ponovno.
      </p>
      <p className="max-w-md text-sm leading-relaxed text-gn-text-secondary">
        Something went wrong. Please try again.
      </p>
      <p className="max-w-md text-xs leading-relaxed text-gn-text-tertiary">
        Ako koristiš automatski prijevod stranice u pregledniku (npr. Google), isključi ga za ovu
        stranicu — prijevod često sruši React aplikacije. / If you use automatic page translation in
        the browser, turn it off for this site.
      </p>
      {error.digest ? (
        <p className="max-w-md font-mono text-xs text-gn-text-tertiary">Ref: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className={GN_PRIMARY_BUTTON_CLASS}>
          Pokušaj ponovno / Try again
        </button>
        <a href={homeHref} className={GN_SECONDARY_BUTTON_CLASS}>
          Početna / Home
        </a>
        <a href={loginHref} className={GN_SECONDARY_BUTTON_CLASS}>
          Prijava / Sign in
        </a>
      </div>
    </div>
  );
}
