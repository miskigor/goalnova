import { supabase } from "./client";
import { sortPlayersForScouts } from "@/lib/premium/playerPremium";
import {
  logFullSupabaseError,
  supabaseErrorToUserMessage,
} from "./logError";
import {
  rpcFetchPublicPlayerProfilesDiscover,
  rpcFetchPublicPlayerProfilesSearch,
  type PlayerProfileRow,
  type PublicPlayerProfileSearchFilters,
} from "@/lib/supabase/publicPlayerProfiles";

export type { PlayerProfileRow };

/**
 * Load active player profiles via safe RPC; filtering/search runs on the client.
 */
export async function fetchAllPlayerProfilesForDiscover(): Promise<{
  rows: PlayerProfileRow[];
  errorMessage: string | null;
}> {
  const { rows, errorMessage } = await rpcFetchPublicPlayerProfilesDiscover(supabase, 300);

  if (errorMessage) {
    logFullSupabaseError("Discover: fetchAllPlayerProfiles", new Error(errorMessage));
    return {
      rows: [],
      errorMessage,
    };
  }

  return {
    rows: sortPlayersForScouts(rows),
    errorMessage: null,
  };
}

/** Scout discover search with server-side filters (name/username ilike + profile fields). */
export async function fetchPlayerProfilesForDiscoverSearch(
  filters: PublicPlayerProfileSearchFilters,
  limit = 100,
): Promise<{
  rows: PlayerProfileRow[];
  errorMessage: string | null;
}> {
  const { rows, errorMessage } = await rpcFetchPublicPlayerProfilesSearch(
    supabase,
    filters,
    limit,
  );

  if (errorMessage) {
    logFullSupabaseError("Discover: search players", new Error(errorMessage));
    return { rows: [], errorMessage };
  }

  return {
    rows: sortPlayersForScouts(rows),
    errorMessage: null,
  };
}
