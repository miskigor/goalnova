import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type FriendChallengePlayerRow = {
  user_id: string;
  username: string;
  display_name: string;
  bonus_xp: number;
  quiz_xp: number;
  total_xp: number;
  rank?: number;
};

export type FriendChallengeChallengerPreview = {
  user_id: string;
  username: string;
  display_name: string;
};

export type FriendChallengePayload = {
  id: string;
  status: "pending" | "active" | "completed" | "cancelled";
  challenger_id: string;
  opponent_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  viewer_id: string | null;
  is_challenger: boolean;
  is_opponent: boolean;
  is_participant: boolean;
  challenger: FriendChallengeChallengerPreview | null;
  players: FriendChallengePlayerRow[];
  winner_user_id: string | null;
  error?: string;
};

export type FriendChallengeCreatePayload = {
  id: string;
  status: string;
  challenger_id: string;
};

export async function rpcFriendChallengeCreate(): Promise<{
  data: FriendChallengeCreatePayload | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_friend_challenge_create");
  if (error) {
    logFullSupabaseError("[friendChallenge] create", error);
    return { data: null, error: error.message };
  }
  return { data: (data ?? null) as FriendChallengeCreatePayload | null, error: null };
}

export async function rpcFriendChallengeAccept(challengeId: string): Promise<{
  data: FriendChallengePayload | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_friend_challenge_accept", {
    p_challenge_id: challengeId,
  });
  if (error) {
    logFullSupabaseError("[friendChallenge] accept", error, { challengeId });
    return { data: null, error: error.message };
  }
  return { data: parseFriendChallengePayload(data), error: null };
}

export async function rpcFriendChallengeGet(challengeId: string): Promise<{
  data: FriendChallengePayload | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_friend_challenge_get", {
    p_challenge_id: challengeId,
  });
  if (error) {
    logFullSupabaseError("[friendChallenge] get", error, { challengeId });
    return { data: null, error: error.message };
  }
  const parsed = parseFriendChallengePayload(data);
  if (parsed?.error === "not_found") {
    return { data: null, error: "not_found" };
  }
  return { data: parsed, error: null };
}

export async function rpcFriendChallengeListMine(limit = 10): Promise<{
  rows: FriendChallengePayload[];
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_friend_challenge_list_mine", {
    p_limit: limit,
  });
  if (error) {
    logFullSupabaseError("[friendChallenge] list_mine", error);
    return { rows: [], error: error.message };
  }
  const rows = Array.isArray(data) ? data : [];
  return {
    rows: rows
      .map((row) => parseFriendChallengePayload(row))
      .filter((row): row is FriendChallengePayload => row != null && !row.error),
    error: null,
  };
}

function parseFriendChallengePayload(raw: unknown): FriendChallengePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.error === "not_found") {
    return { error: "not_found" } as FriendChallengePayload;
  }
  const playersRaw = Array.isArray(o.players) ? o.players : [];
  const players: FriendChallengePlayerRow[] = playersRaw.map((p) => {
    const row = p as Record<string, unknown>;
    return {
      user_id: String(row.user_id ?? ""),
      username: String(row.username ?? ""),
      display_name: String(row.display_name ?? "Player"),
      bonus_xp: Number(row.bonus_xp ?? 0),
      quiz_xp: Number(row.quiz_xp ?? 0),
      total_xp: Number(row.total_xp ?? 0),
      rank: row.rank != null ? Number(row.rank) : undefined,
    };
  });
  const challengerRaw = o.challenger as Record<string, unknown> | null;
  return {
    id: String(o.id ?? ""),
    status: String(o.status ?? "pending") as FriendChallengePayload["status"],
    challenger_id: String(o.challenger_id ?? ""),
    opponent_id: o.opponent_id ? String(o.opponent_id) : null,
    start_date: o.start_date ? String(o.start_date) : null,
    end_date: o.end_date ? String(o.end_date) : null,
    created_at: String(o.created_at ?? ""),
    viewer_id: o.viewer_id ? String(o.viewer_id) : null,
    is_challenger: Boolean(o.is_challenger),
    is_opponent: Boolean(o.is_opponent),
    is_participant: Boolean(o.is_participant),
    challenger: challengerRaw
      ? {
          user_id: String(challengerRaw.user_id ?? ""),
          username: String(challengerRaw.username ?? ""),
          display_name: String(challengerRaw.display_name ?? "Player"),
        }
      : null,
    players,
    winner_user_id: o.winner_user_id ? String(o.winner_user_id) : null,
  };
}

export function buildFriendChallengeShareUrl(
  challengeId: string,
  origin?: string,
  locale?: string,
): string {
  const base = (origin ?? "").replace(/\/$/, "");
  const path = `/challenge/${encodeURIComponent(challengeId)}`;
  if (!locale || locale === "en") {
    return `${base}${path}`;
  }
  return `${base}/${locale}${path}`;
}
