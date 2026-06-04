import type { Json } from "@/lib/supabase/database.types";
import {
  WEEKLY_CHALLENGE_CONTENT_LOCALES,
  type WeeklyChallengeContentLocale,
} from "@/lib/weeklyChallenges/weeklyChallengeLocales";
import type {
  WeeklyChallengeFormInput,
  WeeklyChallengeLocaleContent,
  WeeklyChallengeRow,
  WeeklyChallengeTranslations,
} from "@/lib/supabase/weeklyChallenges.types";

const FALLBACK_LOCALE: WeeklyChallengeContentLocale = "en";

export function emptyWeeklyChallengeLocaleContent(): WeeklyChallengeLocaleContent {
  return {
    title: "",
    description: "",
    rules: "",
    equipment: "",
    badgeName: "",
  };
}

export function emptyWeeklyChallengeTranslations(): WeeklyChallengeTranslations {
  const out = {} as WeeklyChallengeTranslations;
  for (const locale of WEEKLY_CHALLENGE_CONTENT_LOCALES) {
    out[locale] = emptyWeeklyChallengeLocaleContent();
  }
  return out;
}

function trimOrNull(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
}

function pickLocaleBranch(
  raw: unknown,
  locale: WeeklyChallengeContentLocale,
): WeeklyChallengeLocaleContent {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyWeeklyChallengeLocaleContent();
  }
  const branch = (raw as Record<string, unknown>)[locale];
  if (!branch || typeof branch !== "object" || Array.isArray(branch)) {
    return emptyWeeklyChallengeLocaleContent();
  }
  const o = branch as Record<string, unknown>;
  return {
    title: typeof o.title === "string" ? o.title : "",
    description: typeof o.description === "string" ? o.description : "",
    rules: typeof o.rules === "string" ? o.rules : "",
    equipment: typeof o.equipment === "string" ? o.equipment : "",
    badgeName:
      typeof o.badge_name === "string"
        ? o.badge_name
        : typeof o.badgeName === "string"
          ? o.badgeName
          : "",
  };
}

/** Parse DB `translations` + base columns into a full per-locale admin form. */
export function weeklyChallengeRowToForm(row: WeeklyChallengeRow): WeeklyChallengeFormInput {
  const translations = emptyWeeklyChallengeTranslations();
  for (const locale of WEEKLY_CHALLENGE_CONTENT_LOCALES) {
    const fromJson = pickLocaleBranch(row.translations, locale);
    const hasJson =
      fromJson.title.trim() ||
      fromJson.description.trim() ||
      fromJson.rules.trim() ||
      fromJson.equipment.trim() ||
      fromJson.badgeName.trim();
    if (hasJson) {
      translations[locale] = fromJson;
      continue;
    }
    if (locale === FALLBACK_LOCALE) {
      translations[locale] = {
        title: row.title,
        description: row.description ?? "",
        rules: row.rules ?? "",
        equipment: row.equipment ?? "",
        badgeName: row.badge_name ?? "",
      };
    }
  }
  return {
    translations,
    rewardXp: row.reward_xp,
    maxVideoDurationSeconds: row.max_video_duration_seconds,
    freeAttempts: row.free_attempts,
    premiumAttempts: row.premium_attempts,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    isPublic: row.is_public,
  };
}

export function translationsFormToJsonb(
  translations: WeeklyChallengeTranslations,
): Record<string, Record<string, string | null>> {
  const out: Record<string, Record<string, string | null>> = {};
  for (const locale of WEEKLY_CHALLENGE_CONTENT_LOCALES) {
    const c = translations[locale];
    out[locale] = {
      title: trimOrNull(c.title),
      description: trimOrNull(c.description),
      rules: trimOrNull(c.rules),
      equipment: trimOrNull(c.equipment),
      badge_name: trimOrNull(c.badgeName),
    };
  }
  return out;
}

/** Base columns mirror English (fallback) for legacy readers and NOT NULL title. */
export function fallbackBaseColumnsFromTranslations(
  translations: WeeklyChallengeTranslations,
): {
  title: string;
  description: string | null;
  rules: string | null;
  equipment: string | null;
  badge_name: string | null;
} {
  const en = translations[FALLBACK_LOCALE];
  const title = en.title.trim();
  return {
    title,
    description: trimOrNull(en.description),
    rules: trimOrNull(en.rules),
    equipment: trimOrNull(en.equipment),
    badge_name: trimOrNull(en.badgeName),
  };
}

export function weeklyChallengeFormToDbPayload(input: WeeklyChallengeFormInput): {
  title: string;
  description: string | null;
  rules: string | null;
  equipment: string | null;
  badge_name: string | null;
  reward_xp: number;
  max_video_duration_seconds: number | null;
  free_attempts: number;
  premium_attempts: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_public: boolean;
  translations: Json;
} {
  const base = fallbackBaseColumnsFromTranslations(input.translations);
  return {
    ...base,
    reward_xp: Math.max(0, Math.floor(input.rewardXp)),
    max_video_duration_seconds: input.maxVideoDurationSeconds,
    free_attempts: Math.max(0, Math.floor(input.freeAttempts)),
    premium_attempts: Math.max(0, Math.floor(input.premiumAttempts)),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    is_active: input.isActive,
    is_public: input.isPublic,
    translations: translationsFormToJsonb(input.translations) as Json,
  };
}

export function listDisplayTitle(row: WeeklyChallengeRow): string {
  const en = pickLocaleBranch(row.translations, FALLBACK_LOCALE);
  if (en.title.trim()) return en.title.trim();
  return row.title.trim() || "—";
}
