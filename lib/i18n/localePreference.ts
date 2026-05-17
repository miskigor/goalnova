import { hrefWithLocale, routing, type AppLocale } from "@/i18n/routing";

export const PITCHRUSCH_LOCALE_KEY = "pitchrusch_locale";
export const PITCHRUSCH_LOCALE_COOKIE = PITCHRUSCH_LOCALE_KEY;

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

export function localeFromPathname(pathname: string): AppLocale | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  return isAppLocale(seg) ? seg : null;
}

export function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PITCHRUSCH_LOCALE_KEY);
    return isAppLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistLocalePreference(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PITCHRUSCH_LOCALE_KEY, locale);
  } catch {
    /* private mode / quota */
  }
  const maxAge = LOCALE_COOKIE_MAX_AGE;
  document.cookie = `${PITCHRUSCH_LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function buildLocalizedHref(pathname: string, locale: AppLocale): string {
  const path = pathname && pathname.length > 0 ? pathname : "/";
  return hrefWithLocale(path, locale);
}
