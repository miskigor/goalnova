import { locales, type AppLocale } from "@/i18n/routing";

/** All PitchRusch app locales — must match `i18n/routing.ts` and `weekly_challenges.translations` keys. */
export const WEEKLY_CHALLENGE_CONTENT_LOCALES = locales;

export type WeeklyChallengeContentLocale = AppLocale;

export function isWeeklyChallengeContentLocale(
  value: string,
): value is WeeklyChallengeContentLocale {
  return (WEEKLY_CHALLENGE_CONTENT_LOCALES as readonly string[]).includes(value);
}
