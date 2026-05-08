import type { Database } from "@/lib/supabase/database.types";

/**
 * `public.challenges` — base: `20260405100000_challenges.sql`,
 * admin fields: `20260407140000_challenges_admin_fields_rls.sql`,
 * structured rewards: `20260427180000_challenges_rewards_winners_delete.sql`,
 * canonical reward column names: `20260428120000_challenges_canonical_reward_columns.sql`.
 * Long-form prize copy is always `reward_detail` (never `reward_description` in new schema).
 */
export type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

/** PostgREST `select()` fragment — keep aligned with the table. */
export const CHALLENGE_SELECT_COLUMNS =
  "id, slug, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, translations, created_at, rules, reward, reward_title, reward_detail, reward_type, reward_image_url, expires_at, status" as const;

/** Embed fallback when `slug` column is missing on older databases. */
export const CHALLENGE_SELECT_COLUMNS_NO_SLUG =
  "id, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, translations, created_at, rules, reward, reward_title, reward_detail, reward_type, reward_image_url, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_NO_TRANSLATIONS =
  "id, slug, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, created_at, rules, reward, reward_title, reward_detail, reward_type, reward_image_url, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_NO_TRANSLATIONS_NO_SLUG =
  "id, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, created_at, rules, reward, reward_title, reward_detail, reward_type, reward_image_url, expires_at, status" as const;

/**
 * Databases migrated through admin fields but not yet through structured reward columns
 * (`reward_title`, `reward_detail`, …). Avoid selecting columns that do not exist.
 */
export const CHALLENGE_SELECT_COLUMNS_LEGACY =
  "id, slug, title, description, created_at, rules, reward, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_LEGACY_NO_SLUG =
  "id, title, description, created_at, rules, reward, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED =
  "id, slug, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, translations, created_at, rules, reward, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED_NO_SLUG =
  "id, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, translations, created_at, rules, reward, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED_NO_TRANSLATIONS =
  "id, slug, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, created_at, rules, reward, expires_at, status" as const;

export const CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED_NO_TRANSLATIONS_NO_SLUG =
  "id, title, description, instructions, max_video_duration_seconds, equipment, rules_json, scoring, badge, created_at, rules, reward, expires_at, status" as const;

/** Prefer full projection; retry for older `public.challenges` without structured reward columns. */
export const CHALLENGE_SELECT_COLUMN_FALLBACKS = [
  CHALLENGE_SELECT_COLUMNS,
  CHALLENGE_SELECT_COLUMNS_NO_SLUG,
  CHALLENGE_SELECT_COLUMNS_NO_TRANSLATIONS,
  CHALLENGE_SELECT_COLUMNS_NO_TRANSLATIONS_NO_SLUG,
  CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED,
  CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED_NO_SLUG,
  CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED_NO_TRANSLATIONS,
  CHALLENGE_SELECT_COLUMNS_WITH_STRUCTURED_NO_TRANSLATIONS_NO_SLUG,
  CHALLENGE_SELECT_COLUMNS_LEGACY,
  CHALLENGE_SELECT_COLUMNS_LEGACY_NO_SLUG,
] as const;

/**
 * Runs `runner` with each column list until PostgREST returns no error.
 * Use for selects/embeds so unmigrated DBs still load challenges without structured reward columns.
 */
/**
 * Dynamic `.select(cols)` prevents Supabase from inferring row types; callers pass `T` for the
 * expected `data` shape from a successful response.
 */
export async function withChallengeSelectFallback<T>(
  runner: (columns: string) => PromiseLike<unknown>,
): Promise<{
  data: T | null;
  error: unknown | null;
  columns: string | null;
}> {
  let lastError: unknown | null = null;
  for (const columns of CHALLENGE_SELECT_COLUMN_FALLBACKS) {
    const res = (await runner(columns)) as { data: T; error: unknown };
    const { data, error } = res;
    if (!error) return { data, error: null, columns };
    lastError = error;
  }
  return { data: null, error: lastError, columns: null };
}

/** URL-safe slug from title (fallback `challenge`). */
export function slugifyChallengeTitle(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return s.length > 0 ? s : "challenge";
}

/** URL segment for `/challenges/[segment]`: slug when non-empty, otherwise id. */
export function challengeLinkSegment(row: { id: string; slug?: string }): string {
  const s = typeof row.slug === "string" ? row.slug.trim() : "";
  if (s.length > 0) return s;
  return row.id.trim();
}

/**
 * Visible challenge label from `title` (trimmed). Used in pills and lists.
 * Does not use slug or legacy fields.
 */
export function challengeDisplayTitle(row: { title?: string | null }): string {
  const title = typeof row.title === "string" ? row.title.trim() : "";
  return title.length > 0 ? title : "Challenge";
}

/**
 * Normalizes API/embed JSON into {@link ChallengeRow} without throwing.
 * Drops rows missing `id`. Unknown keys (e.g. removed columns) are ignored.
 */
export function parseChallengeRowLoose(raw: unknown): ChallengeRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  const id = o.id.trim();
  const slug =
    typeof o.slug === "string" && o.slug.trim().length > 0
      ? o.slug.trim()
      : "";
  const title =
    typeof o.title === "string" && o.title.trim().length > 0
      ? o.title.trim()
      : "Challenge";
  const description =
    typeof o.description === "string" ? o.description : null;
  const instructions =
    typeof o.instructions === "string" ? o.instructions : null;
  const max_video_duration_seconds =
    typeof o.max_video_duration_seconds === "number" &&
    Number.isFinite(o.max_video_duration_seconds)
      ? o.max_video_duration_seconds
      : null;
  const equipment = o.equipment === undefined ? null : (o.equipment as Database["public"]["Tables"]["challenges"]["Row"]["equipment"]);
  const rules_json = o.rules_json === undefined ? null : (o.rules_json as Database["public"]["Tables"]["challenges"]["Row"]["rules_json"]);
  const scoring = o.scoring === undefined ? null : (o.scoring as Database["public"]["Tables"]["challenges"]["Row"]["scoring"]);
  const badge =
    typeof o.badge === "string" && o.badge.trim().length > 0 ? o.badge.trim() : null;
  const translations =
    o.translations === undefined
      ? null
      : (o.translations as Database["public"]["Tables"]["challenges"]["Row"]["translations"]);
  const rules = typeof o.rules === "string" ? o.rules : null;
  const reward = typeof o.reward === "string" ? o.reward : null;
  const reward_title =
    typeof o.reward_title === "string" && o.reward_title.trim()
      ? o.reward_title.trim()
      : null;
  const reward_detailRaw =
    typeof o.reward_detail === "string" && o.reward_detail.trim()
      ? o.reward_detail.trim()
      : null;
  const reward_descriptionLegacy =
    typeof o.reward_description === "string" && o.reward_description.trim()
      ? o.reward_description.trim()
      : null;
  const reward_detail = reward_detailRaw ?? reward_descriptionLegacy;
  const reward_type =
    typeof o.reward_type === "string" && o.reward_type.trim()
      ? o.reward_type.trim()
      : null;
  const reward_image_url =
    typeof o.reward_image_url === "string" && o.reward_image_url.trim()
      ? o.reward_image_url.trim()
      : null;
  const expires_at =
    typeof o.expires_at === "string" && o.expires_at ? o.expires_at : null;
  const statusRaw = typeof o.status === "string" ? o.status.trim() : "";
  const status =
    statusRaw === "draft" || statusRaw === "active" || statusRaw === "ended"
      ? statusRaw
      : "active";
  const created_at =
    typeof o.created_at === "string" && o.created_at
      ? o.created_at
      : new Date(0).toISOString();
  return {
    id,
    slug,
    title,
    description,
    instructions,
    max_video_duration_seconds,
    equipment,
    rules_json,
    scoring,
    badge,
    translations,
    rules,
    reward,
    reward_title,
    reward_detail,
    reward_type,
    reward_image_url,
    expires_at,
    status,
    created_at,
  };
}
