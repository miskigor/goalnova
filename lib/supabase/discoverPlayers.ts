import { supabase, type Database } from "./client";
import { sortPlayersForScouts } from "@/lib/premium/playerPremium";
import {
  logFullSupabaseError,
  supabaseErrorToUserMessage,
} from "./logError";

export type PlayerProfileRow =
  Database["public"]["Tables"]["player_profiles"]["Row"];

/**
 * Load all rows once; filtering/search runs on the client.
 */
export async function fetchAllPlayerProfilesForDiscover(): Promise<{
  rows: PlayerProfileRow[];
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("player_profiles")
    .select("*")
    .limit(300);

  if (error) {
    logFullSupabaseError("Discover: fetchAllPlayerProfiles", error);
    return {
      rows: [],
      errorMessage: supabaseErrorToUserMessage(error),
    };
  }

  const rows = (data ?? []) as PlayerProfileRow[];
  const ids = [...new Set(rows.map((r) => r.id).filter(Boolean))];
  if (ids.length === 0) return { rows, errorMessage: null };

  const { data: users, error: usersErr } = await supabase
    .from("users")
    .select("id,is_deleted")
    .in("id", ids);
  if (usersErr) {
    logFullSupabaseError("Discover: users(is_deleted) filter", usersErr, {
      idsCount: ids.length,
    });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(usersErr) };
  }
  const active = new Set(
    (users ?? [])
      .filter((u) => !u.is_deleted)
      .map((u) => u.id),
  );
  return {
    rows: sortPlayersForScouts(rows.filter((r) => active.has(r.id))),
    errorMessage: null,
  };
}
