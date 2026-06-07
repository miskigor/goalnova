import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/** Path without locale prefix, e.g. `/explore` or `/player/alex`. */
export function localizedPath(pathname: string, locale: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === routing.defaultLocale) {
    return path;
  }
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function localizedCanonicalPath(locale: string, pathname: string): string {
  return localizedPath(pathname, locale);
}

/** hreflang cluster with `x-default` pointing at the default locale URL. */
export function buildLocaleAlternates(pathname: string): NonNullable<Metadata["alternates"]> {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, localizedPath(path, locale)]),
  ) as Record<string, string>;

  languages["x-default"] = localizedPath(path, routing.defaultLocale);

  return {
    canonical: localizedPath(path, routing.defaultLocale),
    languages,
  };
}
