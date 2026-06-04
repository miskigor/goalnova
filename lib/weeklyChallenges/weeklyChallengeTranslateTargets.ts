import { locales, type AppLocale } from "@/i18n/routing";
import type { WeeklyChallengeLocaleContent } from "@/lib/supabase/weeklyChallenges.types";

/** Locales generated from English (excludes `en`). */
export const WEEKLY_CHALLENGE_TRANSLATION_TARGET_LOCALES = locales.filter(
  (l): l is Exclude<AppLocale, "en"> => l !== "en",
);

export type WeeklyChallengeGeneratedTranslations = Record<
  (typeof WEEKLY_CHALLENGE_TRANSLATION_TARGET_LOCALES)[number],
  WeeklyChallengeLocaleContent
>;

export const WEEKLY_CHALLENGE_LOCALE_LANGUAGE_NAMES: Record<
  Exclude<AppLocale, "en">,
  string
> = {
  hr: "Croatian",
  de: "German",
  bs: "Bosnian",
  es: "Spanish",
  pt: "Portuguese",
  sr: "Serbian",
  fr: "French",
  it: "Italian",
  nl: "Dutch",
  tr: "Turkish",
  ar: "Arabic",
};
