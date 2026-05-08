import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/client";
import {
  extractPostgrestErrorFields,
  logFullSupabaseError,
  supabaseErrorToUserMessage,
} from "@/lib/supabase/logError";

type Client = SupabaseClient<Database>;

export async function fetchScoutHasPlayerShortlisted(
  client: Client,
  scoutUserId: string,
  playerUserId: string,
): Promise<{ saved: boolean; error: string | null }> {
  const { data, error } = await client
    .from("scout_saved_players")
    .select("player_user_id")
    .eq("scout_user_id", scoutUserId)
    .eq("player_user_id", playerUserId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[scout shortlist] fetch saved state", error, {
      scoutUserId,
      playerUserId,
    });
    return {
      saved: false,
      error: supabaseErrorToUserMessage(error),
    };
  }

  return { saved: Boolean(data?.player_user_id), error: null };
}

export async function shortlistAddPlayer(
  client: Client,
  scoutUserId: string,
  playerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!scoutUserId || !playerUserId || scoutUserId === playerUserId) {
    return { ok: false, error: "Invalid shortlist request." };
  }

  const { error } = await client.from("scout_saved_players").insert({
    scout_user_id: scoutUserId,
    player_user_id: playerUserId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    logFullSupabaseError("[scout shortlist] insert", error, {
      scoutUserId,
      playerUserId,
    });
    const fields = extractPostgrestErrorFields(error);
    return {
      ok: false,
      error: fields.message?.trim() || supabaseErrorToUserMessage(error),
    };
  }

  return { ok: true };
}

export async function shortlistRemovePlayer(
  client: Client,
  scoutUserId: string,
  playerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!scoutUserId || !playerUserId) {
    return { ok: false, error: "Invalid request." };
  }

  const { error } = await client
    .from("scout_saved_players")
    .delete()
    .eq("scout_user_id", scoutUserId)
    .eq("player_user_id", playerUserId);

  if (error) {
    logFullSupabaseError("[scout shortlist] delete", error, {
      scoutUserId,
      playerUserId,
    });
    const fields = extractPostgrestErrorFields(error);
    return {
      ok: false,
      error: fields.message?.trim() || supabaseErrorToUserMessage(error),
    };
  }

  return { ok: true };
}
