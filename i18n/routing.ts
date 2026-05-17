import { defineRouting } from "next-intl/routing";

export const locales = [
  "en",
  "hr",
  "de",
  "bs",
  "es",
  "pt",
  "sr",
  "fr",
  "it",
  "nl",
  "tr",
  "ar",
] as const;

export type AppLocale = (typeof locales)[number];

export const RTL_LOCALES: AppLocale[] = ["ar"];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "en",
  localePrefix: "as-needed",
  /** Locale from URL + `pitchrusch_locale` cookie (see `proxy.ts`); first visit defaults to English. */
  localeDetection: false,
});

/**
 * Build a same-origin path for `<a href>` / `location.assign`, matching `localePrefix: "as-needed"`.
 * Use on the marketing shell where client-side `Link` navigation can stall on mobile HTTP (LAN dev).
 */
export function hrefWithLocale(pathname: string, locale: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === routing.defaultLocale) {
    return path;
  }
  const tail = path === "/" ? "" : path;
  return `/${locale}${tail}`;
}
