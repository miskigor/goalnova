import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

/** Open Graph `locale` values aligned with app locales. */
const OG_LOCALE: Record<AppLocale, string> = {
  en: "en_US",
  hr: "hr_HR",
  de: "de_DE",
  bs: "bs_BA",
  es: "es_ES",
  pt: "pt_PT",
  sr: "sr_RS",
  fr: "fr_FR",
  it: "it_IT",
  nl: "nl_NL",
  tr: "tr_TR",
  ar: "ar_SA",
};

export function ogLocaleFromAppLocale(locale: string): string {
  if ((routing.locales as readonly string[]).includes(locale)) {
    return OG_LOCALE[locale as AppLocale];
  }
  return OG_LOCALE[routing.defaultLocale];
}
