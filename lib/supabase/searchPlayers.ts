import { devError } from "@/lib/devLog";
import { sortPlayersForScouts } from "@/lib/premium/playerPremium";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

export type SearchPlayerRow = Database["public"]["Tables"]["player_profiles"]["Row"];

const RESULT_LIMIT = 40;

function escapeIlike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type PlayerSearchFilters = {
  /** Name or username (ilike on full_name OR username). */
  q: string;
  position?: string;
  country?: string;
  city?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  preferredFoot?: string;
  club?: string;
};

/**
 * Player search: optional name query plus optional field filters (AND).
 * If everything is empty, returns no rows.
 */
export async function searchPlayersWithFilters(
  filters: PlayerSearchFilters,
): Promise<{ rows: SearchPlayerRow[]; error: string | null }> {
  const q = filters.q.trim();
  const position = filters.position?.trim() ?? "";
  const country = filters.country?.trim() ?? "";
  const city = filters.city?.trim() ?? "";
  const foot = filters.preferredFoot?.trim() ?? "";
  const club = filters.club?.trim() ?? "";

  const hasName = q.length > 0;
  const hasExtra =
    position.length > 0 ||
    country.length > 0 ||
    city.length > 0 ||
    foot.length > 0 ||
    club.length > 0 ||
    (filters.ageMin != null && Number.isFinite(filters.ageMin)) ||
    (filters.ageMax != null && Number.isFinite(filters.ageMax));

  if (!hasName && !hasExtra) {
    return { rows: [], error: null };
  }

  let query = supabase.from("player_profiles").select("*");

  if (hasName) {
    const pattern = escapeIlike(q);
    query = query.or(`username.ilike.%${pattern}%,full_name.ilike.%${pattern}%`);
  }
  if (position.length > 0) {
    query = query.ilike("position", `%${escapeIlike(position)}%`);
  }
  if (country.length > 0) {
    query = query.ilike("country", `%${escapeIlike(country)}%`);
  }
  if (city.length > 0) {
    query = query.ilike("city", `%${escapeIlike(city)}%`);
  }
  if (foot.length > 0) {
    query = query.ilike("preferred_foot", `%${escapeIlike(foot)}%`);
  }
  if (club.length > 0) {
    query = query.ilike("club", `%${escapeIlike(club)}%`);
  }
  if (filters.ageMin != null && Number.isFinite(filters.ageMin)) {
    query = query.gte("age", filters.ageMin);
  }
  if (filters.ageMax != null && Number.isFinite(filters.ageMax)) {
    query = query.lte("age", filters.ageMax);
  }

  const { data, error } = await query.limit(RESULT_LIMIT);

  if (error) {
    logFullSupabaseError("[search] searchPlayersWithFilters", error, {
      hasName,
      hasExtra,
    });
    devError("[search] player_profiles query failed", {
      message: supabaseErrorToUserMessage(error),
    });
    return { rows: [], error: supabaseErrorToUserMessage(error) };
  }

  const rows = (data ?? []) as SearchPlayerRow[];
  const ids = [...new Set(rows.map((r) => r.id).filter(Boolean))];
  if (ids.length === 0) return { rows, error: null };

  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id,is_deleted")
    .in("id", ids);
  if (uErr) {
    logFullSupabaseError("[search] users(is_deleted) filter", uErr, {
      idsCount: ids.length,
    });
    return { rows: [], error: supabaseErrorToUserMessage(uErr) };
  }
  const active = new Set(
    (users ?? []).filter((u) => !u.is_deleted).map((u) => u.id),
  );
  const visible = rows.filter((r) => active.has(r.id));
  return { rows: sortPlayersForScouts(visible), error: null };
}

/**
 * @deprecated Prefer {@link searchPlayersWithFilters} with `{ q }` only.
 */
export async function searchPlayersByQuery(
  rawQuery: string,
): Promise<{ rows: SearchPlayerRow[]; error: string | null }> {
  return searchPlayersWithFilters({ q: rawQuery });
}
