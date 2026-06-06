import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/client";
import { devLog, isDev } from "@/lib/devLog";
import { fetchScoutDiscoveryFeed } from "@/lib/supabase/scoutDiscoveryFeed";
import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

type Client = SupabaseClient<Database>;

export type PlayerProfileRow =
  Database["public"]["Tables"]["player_profiles"]["Row"];

export type ScoutSavedPlayerDashboardRow = {
  playerUserId: string;
  savedAt: string;
  profile: PlayerProfileRow;
  maxAiOverall: number | null;
};

export type ScoutRecentContactRow = {
  playerUserId: string;
  lastMessageAt: string;
  profile: PlayerProfileRow;
};

function playerProfileHref(profile: PlayerProfileRow): string {
  const slug = profile.username?.trim() || profile.id;
  return `/player/${encodeURIComponent(slug)}`;
}

export { playerProfileHref };

function emptyPlayerProfile(id: string): PlayerProfileRow {
  return {
    id,
    full_name: null,
    username: null,
    age: null,
    bio: null,
    position: null,
    preferred_foot: null,
    height: null,
    weight: null,
    city: null,
    country: null,
    club: null,
    avatar_url: null,
  };
}

/** Dev/diagnostic snapshot for saved-players fetch (no UI). */
export type ScoutSavedPlayersFetchDebug = {
  sessionUserId: string | null;
  passedScoutUserId: string;
  effectiveScoutUserId: string | null;
  scoutUserIdMatchesSession: boolean;
  savedRowsCount: number;
  savedRows: Array<{ player_user_id: string; created_at: string }>;
  playerIds: string[];
  usersRowsCount: number;
  deletedPlayerIds: string[];
  livePlayerIds: string[];
  profilesCount: number;
  missingProfileIds: string[];
  finalRowsCount: number;
  errors: {
    saved: string | null;
    users: string | null;
    profiles: string | null;
  };
};

export type ScoutSavedPlayersFetchResult = {
  rows: ScoutSavedPlayerDashboardRow[];
  error: string | null;
  debug: ScoutSavedPlayersFetchDebug;
};

/**
 * Shortlisted players with profiles and best AI overall_score across their videos (if any).
 * RLS on scout_saved_players already scopes rows to auth.uid(); do not add scout_user_id eq
 * from getSession() — session can lag behind the JWT on the wire and filter out valid rows.
 */
export async function fetchScoutSavedPlayersForDashboard(
  client: Client,
  scoutUserId: string,
): Promise<ScoutSavedPlayersFetchResult> {
  const { data: userData } = await client.auth.getUser();
  const sessionUserId = userData.user?.id ?? null;
  const effectiveScoutUserId = sessionUserId ?? (scoutUserId || null);

  const debug: ScoutSavedPlayersFetchDebug = {
    sessionUserId,
    passedScoutUserId: scoutUserId,
    effectiveScoutUserId,
    scoutUserIdMatchesSession:
      sessionUserId != null && scoutUserId !== ""
        ? sessionUserId === scoutUserId
        : true,
    savedRowsCount: 0,
    savedRows: [],
    playerIds: [],
    usersRowsCount: 0,
    deletedPlayerIds: [],
    livePlayerIds: [],
    profilesCount: 0,
    missingProfileIds: [],
    finalRowsCount: 0,
    errors: {
      saved: null,
      users: null,
      profiles: null,
    },
  };

  const { data: saved, error: savedErr } = await client
    .from("scout_saved_players")
    .select("player_user_id, created_at, scout_user_id")
    .order("created_at", { ascending: false });

  if (savedErr) {
    debug.errors.saved = supabaseErrorToUserMessage(savedErr);
    logFullSupabaseError("[scout dashboard] saved players select", savedErr, {
      scoutUserId: effectiveScoutUserId,
      sessionUserId,
      passedScoutUserId: scoutUserId,
    });
    return { rows: [], error: debug.errors.saved, debug };
  }

  debug.savedRowsCount = saved?.length ?? 0;
  debug.savedRows = (saved ?? []).map((s) => ({
    player_user_id: s.player_user_id,
    created_at: s.created_at,
  }));

  if (!saved?.length) {
    if (isDev && sessionUserId && scoutUserId && sessionUserId !== scoutUserId) {
      devLog("[scout dashboard] saved players empty — session vs passed scout id mismatch", {
        sessionUserId,
        passedScoutUserId: scoutUserId,
      });
    }
    return { rows: [], error: null, debug };
  }

  const ids = [...new Set(saved.map((s) => s.player_user_id))];
  debug.playerIds = ids;
  debug.livePlayerIds = ids;

  const { data: profiles, error: profErr } = await client
    .from("player_profiles")
    .select("*")
    .in("id", ids);

  if (profErr) {
    debug.errors.profiles = supabaseErrorToUserMessage(profErr);
    logFullSupabaseError("[scout dashboard] saved profiles select", profErr, {
      scoutUserId: effectiveScoutUserId,
      count: ids.length,
    });
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  debug.profilesCount = profileById.size;
  debug.missingProfileIds = ids.filter((id) => !profileById.has(id));

  const { data: videos, error: vidErr } = await client
    .from("videos")
    .select("id, user_id")
    .in("user_id", ids);

  if (vidErr) {
    logFullSupabaseError("[scout dashboard] videos for AI", vidErr, {
      scoutUserId,
    });
  }

  const videoIds = (videos ?? [])
    .map((v) => v.id)
    .filter((id): id is string => Boolean(id));
  const videoIdToUserId = new Map(
    (videos ?? [])
      .filter((v) => v.id)
      .map((v) => [v.id as string, v.user_id] as const),
  );

  const maxByUser = new Map<string, number>();
  if (videoIds.length > 0) {
    const { data: analyses, error: aiErr } = await client
      .from("ai_analyses")
      .select("video_id, overall_score, valid_for_football_analysis")
      .in("video_id", videoIds);

    if (aiErr) {
      logFullSupabaseError("[scout dashboard] ai_analyses batch", aiErr, {
        scoutUserId,
      });
    } else {
      for (const a of analyses ?? []) {
        if (a.valid_for_football_analysis === false) continue;
        const uid = videoIdToUserId.get(a.video_id);
        if (!uid) continue;
        const sc = Number(a.overall_score);
        if (!Number.isFinite(sc)) continue;
        const cur = maxByUser.get(uid);
        if (cur === undefined || sc > cur) {
          maxByUser.set(uid, sc);
        }
      }
    }
  }

  const rows: ScoutSavedPlayerDashboardRow[] = [];
  for (const s of saved) {
    const profileRow = profileById.get(s.player_user_id);
    const profile = profileRow ?? emptyPlayerProfile(s.player_user_id);

    const maxAi = maxByUser.get(s.player_user_id);
    rows.push({
      playerUserId: s.player_user_id,
      savedAt: s.created_at,
      profile,
      maxAiOverall: maxAi !== undefined ? maxAi : null,
    });
  }

  debug.finalRowsCount = rows.length;

  if (isDev && saved.length > 0 && rows.length === 0) {
    devLog("[scout dashboard] saved bookmarks exist but no renderable rows", {
      scoutUserId: effectiveScoutUserId,
      savedCount: saved.length,
      profilesFound: profileById.size,
    });
  }

  return { rows, error: null, debug };
}

/**
 * Other participants in recent DM threads, ordered by last message time (players only when profile exists).
 */
export async function fetchScoutRecentContacts(
  client: Client,
  scoutUserId: string,
  limit = 12,
): Promise<{ rows: ScoutRecentContactRow[]; error: string | null }> {
  const { data: msgs, error: msgErr } = await client
    .from("messages")
    .select("sender_id, receiver_id, created_at")
    .or(`sender_id.eq.${scoutUserId},receiver_id.eq.${scoutUserId}`)
    .order("created_at", { ascending: false })
    .limit(400);

  if (msgErr) {
    logFullSupabaseError("[scout dashboard] messages select", msgErr, {
      scoutUserId,
    });
    return { rows: [], error: supabaseErrorToUserMessage(msgErr) };
  }

  const latestByOther = new Map<string, string>();
  for (const m of msgs ?? []) {
    const other =
      m.sender_id === scoutUserId ? m.receiver_id : m.sender_id;
    if (other === scoutUserId) continue;
    if (!latestByOther.has(other)) {
      latestByOther.set(other, m.created_at);
    }
  }

  const orderedOthers = [...latestByOther.entries()].sort(
    (a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime(),
  );

  const topIds = orderedOthers.slice(0, limit).map(([id]) => id);
  if (!topIds.length) {
    return { rows: [], error: null };
  }

  const { data: profiles, error: profErr } = await client
    .from("player_profiles")
    .select("*")
    .in("id", topIds);

  if (profErr) {
    logFullSupabaseError("[scout dashboard] contact profiles", profErr, {
      scoutUserId,
    });
    return { rows: [], error: supabaseErrorToUserMessage(profErr) };
  }

  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows: ScoutRecentContactRow[] = [];
  for (const oid of topIds) {
    const p = pmap.get(oid);
    if (!p) continue;
    rows.push({
      playerUserId: oid,
      lastMessageAt: latestByOther.get(oid) ?? "",
      profile: p,
    });
  }

  return { rows, error: null };
}

const SUGGESTED_LIMIT_VIDEOS = 24;
const SUGGESTED_UNIQUE_PLAYERS = 8;

/**
 * Top discovery-ranked talents, one entry per player (first video in rank order).
 */
export async function fetchScoutSuggestedTalents(
  client: Client,
): Promise<{ items: AugmentedHomeFeedItem[]; error: string | null }> {
  const { items, error } = await fetchScoutDiscoveryFeed(client, {
    limit: SUGGESTED_LIMIT_VIDEOS,
    offset: 0,
    sort: "discovery",
  });

  if (error || !items.length) {
    return { items: [], error };
  }

  const seen = new Set<string>();
  const deduped: AugmentedHomeFeedItem[] = [];
  for (const it of items) {
    const uid = it.video.user_id;
    if (seen.has(uid)) continue;
    seen.add(uid);
    deduped.push(it);
    if (deduped.length >= SUGGESTED_UNIQUE_PLAYERS) break;
  }

  return { items: deduped, error: null };
}
