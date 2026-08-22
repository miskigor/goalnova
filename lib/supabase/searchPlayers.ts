import { devError } from "@/lib/devLog";
import { sortPlayersForScouts } from "@/lib/premium/playerPremium";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import {
  filterPublicPlayerProfileRows,
  rpcFetchPublicPlayerProfilesDiscover,
  rpcFetchPublicPlayerProfilesSearch,
  type PlayerProfileRow,
} from "@/lib/supabase/publicPlayerProfiles";

export type SearchPlayerRow = PlayerProfileRow;

export type SearchPlayerResult = SearchPlayerRow & {
  /** Canonical avatar from `public.users.avatar_url`. */
  userAvatarUrl: string | null;
};

const RESULT_LIMIT = 40;

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
  availableForTrials?: boolean;
  lookingForClub?: boolean;
};

/**
 * Player search: optional name query plus optional field filters (AND).
 * If everything is empty, returns no rows.
 */
export async function searchPlayersWithFilters(
  filters: PlayerSearchFilters,
): Promise<{ rows: SearchPlayerResult[]; error: string | null }> {
  const q = filters.q.trim();
  const position = filters.position?.trim() ?? "";
  const country = filters.country?.trim() ?? "";
  const city = filters.city?.trim() ?? "";
  const foot = filters.preferredFoot?.trim() ?? "";
  const club = filters.club?.trim() ?? "";
  const availableForTrials = filters.availableForTrials === true;
  const lookingForClub = filters.lookingForClub === true;

  const hasName = q.length > 0;
  const hasTextExtra =
    position.length > 0 ||
    country.length > 0 ||
    city.length > 0 ||
    foot.length > 0 ||
    club.length > 0 ||
    (filters.ageMin != null && Number.isFinite(filters.ageMin)) ||
    (filters.ageMax != null && Number.isFinite(filters.ageMax));
  const hasOpennessExtra = availableForTrials || lookingForClub;

  if (!hasName && !hasTextExtra && !hasOpennessExtra) {
    return { rows: [], error: null };
  }

  const fetched = hasName || hasTextExtra
    ? await rpcFetchPublicPlayerProfilesSearch(
        supabase,
        {
          q,
          position,
          country,
          city,
          preferredFoot: foot,
          club,
          ageMin: filters.ageMin,
          ageMax: filters.ageMax,
        },
        RESULT_LIMIT,
      )
    : await rpcFetchPublicPlayerProfilesDiscover(supabase, 300);
  const { rows: fetchedRows, errorMessage } = fetched;
  const filtered = filterPublicPlayerProfileRows(fetchedRows, {
    availableForTrials,
    lookingForClub,
  });

  if (errorMessage) {
    logFullSupabaseError("[search] searchPlayersWithFilters", new Error(errorMessage), {
      hasName,
      hasTextExtra,
      hasOpennessExtra,
    });
    devError("[search] player profile search RPC failed", { message: errorMessage });
    return { rows: [], error: errorMessage };
  }

  const ids = [...new Set(filtered.map((r) => r.id).filter(Boolean))];
  if (ids.length === 0) {
    return {
      rows: filtered.map((r) => ({ ...r, userAvatarUrl: r.avatar_url ?? null })),
      error: null,
    };
  }

  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id,avatar_url")
    .in("id", ids);
  if (uErr) {
    logFullSupabaseError("[search] users avatar_url", uErr, { idsCount: ids.length });
    return { rows: [], error: supabaseErrorToUserMessage(uErr) };
  }
  const avatarByUserId = new Map<string, string | null>();
  for (const u of users ?? []) {
    const v = typeof u.avatar_url === "string" ? u.avatar_url.trim() : "";
    avatarByUserId.set(u.id, v || null);
  }
  const visible = filtered.map(
    (r): SearchPlayerResult => ({
      ...r,
      userAvatarUrl: avatarByUserId.get(r.id) ?? r.avatar_url ?? null,
    }),
  );
  return { rows: sortPlayersForScouts(visible), error: null };
}

/**
 * @deprecated Prefer {@link searchPlayersWithFilters} with `{ q }` only.
 */
export async function searchPlayersByQuery(
  rawQuery: string,
): Promise<{ rows: SearchPlayerResult[]; error: string | null }> {
  return searchPlayersWithFilters({ q: rawQuery });
}
