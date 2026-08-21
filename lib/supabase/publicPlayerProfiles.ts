import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PremiumLikeProfile } from "@/lib/premium/playerPremium";
import { parseInstagramHandle } from "@/lib/instagram/playerInstagram";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

export type PlayerProfileRow = Database["public"]["Tables"]["player_profiles"]["Row"];

/** Safe projection returned by public/scout player profile RPCs. */
export type PublicPlayerProfileRpcRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  age: number | null;
  bio: string | null;
  position: string | null;
  preferred_foot: string | null;
  height: number | null;
  weight: number | null;
  city: string | null;
  country: string | null;
  club: string | null;
  avatar_url: string | null;
  profile_completeness: number | null;
  ai_overall_score: number | null;
  is_available_for_trials: boolean | null;
  is_looking_for_club: boolean | null;
  achievements: string[] | null;
  career_history: Database["public"]["Tables"]["player_profiles"]["Row"]["career_history"];
  profile_highlight: string | null;
  created_at: string | null;
  featured_player_until: string | null;
  founding_player: boolean | null;
  instagram?: string | null;
};

export type ScoutPlayerProfileRpcRow = PublicPlayerProfileRpcRow & {
  is_player_premium: boolean | null;
};

export function rpcRowToPlayerProfileRow(row: PublicPlayerProfileRpcRow): PlayerProfileRow {
  return {
    id: row.id,
    full_name: row.full_name,
    username: row.username,
    age: row.age,
    bio: row.bio,
    position: row.position,
    preferred_foot: row.preferred_foot,
    height: row.height,
    weight: row.weight,
    city: row.city,
    country: row.country,
    club: row.club,
    avatar_url: row.avatar_url,
    profile_completeness: row.profile_completeness,
    ai_overall_score: row.ai_overall_score,
    is_available_for_trials: row.is_available_for_trials,
    is_looking_for_club: row.is_looking_for_club,
    achievements: row.achievements,
    career_history: row.career_history,
    profile_highlight: row.profile_highlight,
    created_at: row.created_at,
    featured_player_until: row.featured_player_until,
    founding_player: row.founding_player,
    instagram: row.instagram ?? null,
  };
}

/** Maps scout RPC premium flag into fields used by existing premium sort helpers. */
export function scoutRpcRowToPremiumLikeProfile(
  row: ScoutPlayerProfileRpcRow,
): PremiumLikeProfile {
  const premium = row.is_player_premium === true;
  return {
    subscription_plan: premium ? "player_premium" : "free",
    subscription_status: premium ? "active" : "inactive",
    profile_completeness: row.profile_completeness,
    ai_overall_score: row.ai_overall_score,
    featured_player_until: row.featured_player_until,
  };
}

function firstRpcRow<T extends { id?: string }>(
  data: T[] | T | null | undefined,
): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  if (typeof data === "object" && data.id) return data;
  return null;
}

type Client = SupabaseClient<Database>;

async function attachPublicInstagram(
  client: Client,
  row: PlayerProfileRow | null,
): Promise<PlayerProfileRow | null> {
  if (!row?.id) return row;
  const fromRow = parseInstagramHandle(row.instagram);
  if (fromRow) return { ...row, instagram: fromRow };
  const { data, error } = await client.rpc("goalnova_public_player_instagram", {
    p_user_id: row.id,
  });
  if (error) return row;
  const handle = parseInstagramHandle(typeof data === "string" ? data : null);
  return { ...row, instagram: handle };
}

export async function rpcFetchPublicPlayerProfileById(
  client: Client,
  userId: string,
): Promise<{ row: PlayerProfileRow | null; errorMessage: string | null }> {
  const id = userId.trim();
  if (!id) return { row: null, errorMessage: null };

  const { data, error } = await client.rpc("goalnova_public_player_profile_row", {
    p_user_id: id,
  });

  if (error) {
    logFullSupabaseError("[publicPlayerProfiles] row by id", error, { userId: id });
    return { row: null, errorMessage: supabaseErrorToUserMessage(error) };
  }

  const raw = firstRpcRow(data as PublicPlayerProfileRpcRow[] | null);
  return { row: await attachPublicInstagram(client, raw ? rpcRowToPlayerProfileRow(raw) : null), errorMessage: null };
}

export async function rpcFetchPublicPlayerProfileByUsername(
  client: Client,
  username: string,
): Promise<{ row: PlayerProfileRow | null; errorMessage: string | null }> {
  const name = username.trim();
  if (!name) return { row: null, errorMessage: null };

  const { data, error } = await client.rpc("goalnova_public_player_profile_by_username", {
    p_username: name,
  });

  if (error) {
    logFullSupabaseError("[publicPlayerProfiles] row by username", error, { username: name });
    return { row: null, errorMessage: supabaseErrorToUserMessage(error) };
  }

  const raw = firstRpcRow(data as PublicPlayerProfileRpcRow[] | null);
  return { row: await attachPublicInstagram(client, raw ? rpcRowToPlayerProfileRow(raw) : null), errorMessage: null };
}

export async function rpcFetchPublicPlayerProfilesByIds(
  client: Client,
  userIds: string[],
): Promise<{ rows: PlayerProfileRow[]; errorMessage: string | null }> {
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { rows: [], errorMessage: null };

  const { data, error } = await client.rpc("goalnova_public_player_profiles_by_ids", {
    p_user_ids: ids,
  });

  if (error) {
    logFullSupabaseError("[publicPlayerProfiles] by ids", error, { count: ids.length });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(error) };
  }

  const rows = ((data ?? []) as PublicPlayerProfileRpcRow[]).map(rpcRowToPlayerProfileRow);
  return { rows, errorMessage: null };
}

export type PublicPlayerProfileSearchFilters = {
  q?: string;
  position?: string;
  country?: string;
  city?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  preferredFoot?: string;
  club?: string;
};

export function normalizePlayerProfileSlug(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

/** Resolves a public player profile from route slug (id, username, or search fallback). */
export async function rpcResolvePublicPlayerProfileBySlug(
  client: Client,
  rawSlug: string,
): Promise<{ row: PlayerProfileRow | null; errorMessage: string | null }> {
  const slug = normalizePlayerProfileSlug(rawSlug);
  if (!slug) return { row: null, errorMessage: null };

  const byId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    slug,
  );

  if (byId) {
    return rpcFetchPublicPlayerProfileById(client, slug);
  }

  const byUsername = await rpcFetchPublicPlayerProfileByUsername(client, slug);
  if (byUsername.row || byUsername.errorMessage) {
    return byUsername;
  }

  const { rows, errorMessage } = await rpcFetchPublicPlayerProfilesSearch(
    client,
    { q: slug },
    5,
  );
  if (errorMessage) {
    return { row: null, errorMessage: null };
  }

  const exact = rows.find(
    (row) =>
      row.username?.trim().toLowerCase() === slug.toLowerCase() ||
      row.id === slug,
  );
  return { row: exact ?? null, errorMessage: null };
}

export async function rpcFetchPublicPlayerProfilesSearch(
  client: Client,
  filters: PublicPlayerProfileSearchFilters,
  limit = 40,
): Promise<{ rows: PlayerProfileRow[]; errorMessage: string | null }> {
  const { data, error } = await client.rpc("goalnova_public_player_profiles_search", {
    p_q: filters.q?.trim() || null,
    p_position: filters.position?.trim() || null,
    p_country: filters.country?.trim() || null,
    p_city: filters.city?.trim() || null,
    p_age_min: filters.ageMin ?? null,
    p_age_max: filters.ageMax ?? null,
    p_preferred_foot: filters.preferredFoot?.trim() || null,
    p_club: filters.club?.trim() || null,
    p_limit: limit,
  });

  if (error) {
    logFullSupabaseError("[publicPlayerProfiles] search", error, { limit, filters });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(error) };
  }

  const rows = ((data ?? []) as PublicPlayerProfileRpcRow[]).map(rpcRowToPlayerProfileRow);
  return { rows, errorMessage: null };
}

export async function rpcFetchPublicPlayerProfilesDiscover(
  client: Client,
  limit = 300,
): Promise<{ rows: PlayerProfileRow[]; errorMessage: string | null }> {
  const { data, error } = await client.rpc("goalnova_public_player_profiles_discover", {
    p_limit: limit,
  });

  if (error) {
    logFullSupabaseError("[publicPlayerProfiles] discover", error, { limit });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(error) };
  }

  const rows = ((data ?? []) as PublicPlayerProfileRpcRow[]).map(rpcRowToPlayerProfileRow);
  return { rows, errorMessage: null };
}

export async function rpcFetchScoutPlayerProfilesByIds(
  client: Client,
  userIds: string[],
): Promise<{
  rows: PlayerProfileRow[];
  premiumById: Map<string, PremiumLikeProfile>;
  errorMessage: string | null;
}> {
  const ids = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { rows: [], premiumById: new Map(), errorMessage: null };
  }

  const { data, error } = await client.rpc("goalnova_scout_player_profiles_by_ids", {
    p_user_ids: ids,
  });

  if (error) {
    logFullSupabaseError("[publicPlayerProfiles] scout by ids", error, { count: ids.length });
    return { rows: [], premiumById: new Map(), errorMessage: supabaseErrorToUserMessage(error) };
  }

  const premiumById = new Map<string, PremiumLikeProfile>();
  const rows: PlayerProfileRow[] = [];
  for (const raw of (data ?? []) as ScoutPlayerProfileRpcRow[]) {
    rows.push(rpcRowToPlayerProfileRow(raw));
    premiumById.set(raw.id, scoutRpcRowToPremiumLikeProfile(raw));
  }
  return { rows, premiumById, errorMessage: null };
}

function fieldIncludes(value: string | null | undefined, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  if (!n) return true;
  return (value ?? "").toLowerCase().includes(n);
}

/** Client-side filter for discover/search/explore profile RPC datasets. */
export function filterPublicPlayerProfileRows(
  rows: PlayerProfileRow[],
  filters: {
    q?: string;
    position?: string;
    country?: string;
    city?: string;
    ageMin?: number | null;
    ageMax?: number | null;
    preferredFoot?: string;
    club?: string;
  },
): PlayerProfileRow[] {
  const q = (filters.q ?? "").trim().toLowerCase();

  return rows.filter((row) => {
    if (q) {
      const name = (row.full_name ?? "").toLowerCase();
      const user = (row.username ?? "").toLowerCase();
      if (!name.includes(q) && !user.includes(q)) return false;
    }
    if (!fieldIncludes(row.position, filters.position ?? "")) return false;
    if (!fieldIncludes(row.country, filters.country ?? "")) return false;
    if (!fieldIncludes(row.city, filters.city ?? "")) return false;
    if (!fieldIncludes(row.preferred_foot, filters.preferredFoot ?? "")) return false;
    if (!fieldIncludes(row.club, filters.club ?? "")) return false;
    if (filters.ageMin != null && Number.isFinite(filters.ageMin)) {
      if (row.age == null || row.age < filters.ageMin) return false;
    }
    if (filters.ageMax != null && Number.isFinite(filters.ageMax)) {
      if (row.age == null || row.age > filters.ageMax) return false;
    }
    return true;
  });
}
