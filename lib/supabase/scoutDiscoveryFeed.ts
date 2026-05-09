import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/client";
import {
  attachChallengesToHomeFeedItems,
  fetchUserAvatarUrlsByUserIds,
  type AugmentedHomeFeedItem,
  type HomeFeedPlayerProfile,
  type HomeFeedVideo,
} from "@/lib/supabase/homeFeed";
import {
  extractPostgrestErrorFields,
  logFullSupabaseError,
  supabaseErrorToUserMessage,
} from "@/lib/supabase/logError";
import { sortVideosForScouts } from "@/lib/premium/playerPremium";

export type ScoutDiscoverySort = "discovery" | "newest" | "most_liked" | "highest_ai";

export type ScoutDiscoveryQuery = {
  limit?: number;
  offset?: number;
  position?: string;
  country?: string;
  city?: string;
  ageMin?: number | null;
  ageMax?: number | null;
  sort?: ScoutDiscoverySort;
};

const DEFAULT_PAGE = 18;

type ScoutRpcRow =
  Database["public"]["Functions"]["scout_discovery_feed"]["Returns"] extends (infer E)[]
    ? E
    : never;

function mapRpcRowToAugmentedItem(row: ScoutRpcRow): AugmentedHomeFeedItem {
  const video: HomeFeedVideo = {
    id: row.video_id,
    user_id: row.user_id,
    video_url: row.video_url,
    caption: row.caption,
    skill_type: row.skill_type,
    city: row.video_city,
    country: row.video_country,
    challenge_id: row.challenge_id,
    selected_music_track_id: null,
    source_video_url: row.source_video_url ?? null,
    processed_video_url: row.processed_video_url ?? null,
    music_start_seconds: 0,
    music_end_seconds: null,
    music_volume: 1,
    created_at: row.video_created_at,
  };

  const profile: HomeFeedPlayerProfile = {
    id: row.user_id,
    full_name: row.full_name,
    username: row.username,
    age: row.age,
    bio: row.bio,
    position: row.player_position,
    preferred_foot: row.preferred_foot,
    height: row.height,
    weight: row.weight,
    city: row.profile_city,
    country: row.profile_country,
    club: row.club,
  };

  return {
    video,
    profile,
    userDisplayName: row.full_name?.trim() || row.username?.trim() || null,
    userAvatarUrl: null,
    challenge: null,
    scoutMetrics: {
      likesCount: Number(row.likes_count ?? 0),
      commentsCount: Number(row.comments_count ?? 0),
      aiOverallScore:
        row.ai_overall_score === null || row.ai_overall_score === undefined
          ? null
          : Number(row.ai_overall_score),
    },
  };
}

function isMissingCityRpcSignature(err: unknown): boolean {
  const f = extractPostgrestErrorFields(err);
  if (f.code !== "PGRST202") return false;
  const text = `${f.message} ${f.details ?? ""} ${f.hint ?? ""}`.toLowerCase();
  return text.includes("scout_discovery_feed") && text.includes("p_city");
}

/**
 * Ranked discovery feed for verified scouts (RPC `scout_discovery_feed`).
 * Returns empty + error message if RPC fails (e.g. not a verified scout — caller should fall back).
 */
export async function fetchScoutDiscoveryFeed(
  client: SupabaseClient<Database>,
  query: ScoutDiscoveryQuery,
): Promise<{ items: AugmentedHomeFeedItem[]; error: string | null }> {
  const limit = query.limit ?? DEFAULT_PAGE;
  const offset = query.offset ?? 0;

  const rpcArgs = {
    p_limit: limit,
    p_offset: offset,
    p_position: query.position?.trim() || null,
    p_country: query.country?.trim() || null,
    p_age_min: query.ageMin ?? null,
    p_age_max: query.ageMax ?? null,
    p_sort: query.sort ?? "discovery",
  };

  let { data, error } = await client.rpc("scout_discovery_feed", {
    ...rpcArgs,
    p_city: query.city?.trim() || null,
  });

  if (error && isMissingCityRpcSignature(error)) {
    // Backward compatibility: DB migration for p_city may not be applied yet.
    const legacy = await client.rpc("scout_discovery_feed", rpcArgs);
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    logFullSupabaseError("[PitchRusch scout discovery] rpc failed", error, {
      sort: query.sort,
      offset,
    });
    return {
      items: [],
      error: supabaseErrorToUserMessage(error),
    };
  }

  const rows = data ?? [];
  let mapped = rows.map(mapRpcRowToAugmentedItem);
  if (mapped.length > 0) {
    const userIds = [...new Set(mapped.map((m) => m.video.user_id).filter(Boolean))];
    const { data: premiumProfiles } = await client
      .from("player_profiles")
      .select("id,subscription_plan,subscription_status,profile_completeness,ai_overall_score")
      .in("id", userIds);
    const premiumById = new Map((premiumProfiles ?? []).map((p) => [p.id, p]));
    const sorted = sortVideosForScouts(
      mapped.map((m) => ({
        item: m,
        profile: premiumById.get(m.video.user_id) ?? null,
        video: m.video,
      })),
    );
    mapped = sorted.map((s) => s.item);
  }
  const allUserIds = [
    ...new Set(mapped.map((m) => m.video.user_id).filter((id): id is string => Boolean(id))),
  ];
  if (allUserIds.length > 0) {
    const { data: users, error: usersErr } = await client
      .from("users")
      .select("id,is_deleted")
      .in("id", allUserIds);
    if (usersErr) {
      logFullSupabaseError("[PitchRusch scout discovery] users(is_deleted) filter failed", usersErr, {
        idsCount: allUserIds.length,
      });
      return { items: [], error: supabaseErrorToUserMessage(usersErr) };
    }
    const active = new Set((users ?? []).filter((u) => !u.is_deleted).map((u) => u.id));
    mapped = mapped.filter((m) => active.has(m.video.user_id));
  }
  const uids = [
    ...new Set(mapped.map((m) => m.video.user_id).filter((id): id is string => Boolean(id))),
  ];
  const avatarByUserId = await fetchUserAvatarUrlsByUserIds(client, uids);
  const withAvatars = mapped.map((m) => {
    const uid = m.video.user_id?.trim() || "";
    const userAvatarUrl = uid ? (avatarByUserId.get(uid) ?? null) : null;
    return { ...m, userAvatarUrl };
  });
  const withChallenges = await attachChallengesToHomeFeedItems(client, withAvatars);

  return { items: withChallenges, error: null };
}
