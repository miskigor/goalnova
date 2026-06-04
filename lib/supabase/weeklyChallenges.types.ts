import type { Json } from "@/lib/supabase/database.types";
import type { AppLocale } from "@/i18n/routing";
import { locales } from "@/i18n/routing";

/** Per-locale weekly challenge copy — keys must match `i18n/routing.ts` `locales`. */
export type WeeklyChallengeContentLocale = AppLocale;

export type WeeklyChallengeLocaleContent = {
  title: string;
  description: string;
  rules: string;
  equipment: string;
  badgeName: string;
};

export type WeeklyChallengeTranslations = Record<
  WeeklyChallengeContentLocale,
  WeeklyChallengeLocaleContent
>;

/** Ensures compile-time coverage of all 12 locales. */
export const WEEKLY_CHALLENGE_LOCALE_KEYS = locales;

export type WeeklyChallengeTranslationsJson = {
  [K in WeeklyChallengeContentLocale]?: {
    title?: string | null;
    description?: string | null;
    rules?: string | null;
    equipment?: string | null;
    badge_name?: string | null;
  };
};

/** Weekly challenge tables — keep in sync with `20260604120000_weekly_challenges_admin_foundation.sql`. */
export type WeeklyChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  equipment: string | null;
  reward_xp: number;
  badge_name: string | null;
  max_video_duration_seconds: number | null;
  free_attempts: number;
  premium_attempts: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_public: boolean;
  translations: WeeklyChallengeTranslationsJson | Json | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyChallengeInsert = {
  id?: string;
  title: string;
  description?: string | null;
  rules?: string | null;
  equipment?: string | null;
  reward_xp?: number;
  badge_name?: string | null;
  max_video_duration_seconds?: number | null;
  free_attempts?: number;
  premium_attempts?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  translations?: WeeklyChallengeTranslationsJson | Json | null;
  created_at?: string;
  updated_at?: string;
};

export type WeeklyChallengeUpdate = Partial<
  Omit<WeeklyChallengeInsert, "id" | "created_at">
>;

export type WeeklyChallengeFormInput = {
  translations: WeeklyChallengeTranslations;
  rewardXp: number;
  maxVideoDurationSeconds: number | null;
  freeAttempts: number;
  premiumAttempts: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isPublic: boolean;
};
