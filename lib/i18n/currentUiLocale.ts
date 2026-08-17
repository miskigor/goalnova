import { routing } from "@/i18n/routing";
import { localeFromPathname, readStoredLocale } from "@/lib/i18n/localePreference";

/** UI locale currently selected in the app (URL, then cookie/localStorage). */
export function currentUiLocale(): string {
  if (typeof window !== "undefined") {
    const fromPath = localeFromPathname(window.location.pathname);
    if (fromPath) return fromPath;
  }
  return readStoredLocale() ?? routing.defaultLocale;
}
