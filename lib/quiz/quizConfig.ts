/** Daily Football Quiz — MVP constants (must match SQL migration). */
export const QUIZ_TIMEZONE = "Europe/Zagreb" as const;
export const QUIZ_ANCHOR_DATE = "2025-01-01" as const;
export const QUIZ_CORRECT_XP = 10;
export const QUIZ_STREAK_BONUS_XP = 25;
export const QUIZ_STREAK_BONUS_INTERVAL = 7;
export const QUIZ_WEEKLY_LEADERBOARD_LIMIT = 10;

export const QUIZ_APP_LOCALES = [
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

export type QuizAppLocale = (typeof QUIZ_APP_LOCALES)[number];
