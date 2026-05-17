"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  buildLocalizedHref,
  persistLocalePreference,
  readStoredLocale,
} from "@/lib/i18n/localePreference";

/**
 * Keeps `pitchrusch_locale` cookie aligned with localStorage and redirects once when
 * storage prefers a locale that does not match the current URL (e.g. after clearing cookies).
 */
export function LocalePreferenceSync() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const stored = readStoredLocale();
    if (stored) {
      persistLocalePreference(stored);
      if (stored !== locale) {
        const href = buildLocalizedHref(pathname ?? "/", stored);
        const target = `${href}${window.location.search}${window.location.hash}`;
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
          window.location.assign(`${window.location.origin}${target}`);
        }
      }
      return;
    }

    persistLocalePreference(locale);
  }, [locale, pathname]);

  return null;
}
