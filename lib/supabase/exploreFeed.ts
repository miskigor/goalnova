import {
  parseChallengeRowLoose,
  withChallengeSelectFallback,
} from "@/lib/challenges/challengeRowUtils";
import { devError, devWarn } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import { hasVideoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { competitionScore as computeCompetitionScore } from "@/lib/challenges/challengeCompetitionScore";
import {
  fetchMusicTrackSummariesByIds,
  selectedMusicTrackIdFromVideo,
  type MusicTrackSummary,
} from "@/lib/supabase/videoMusicSummary";
import { sortVideosForScouts } from "@/lib/premium/playerPremium";
import {
  rpcFetchPublicPlayerProfilesByIds,
  rpcFetchPublicPlayerProfilesSearch,
} from "@/lib/supabase/publicPlayerProfiles";
import {
  publicAiScoresToMap,
  rpcFetchPublicAiScoresForVideos,
} from "@/lib/supabase/publicAiAnalyses";

export type ExploreVideoRow = Database["public"]["Tables"]["videos"]["Row"];
export type ExploreProfileRow =
  Database["public"]["Tables"]["player_profiles"]["Row"];

export type ChallengeRowLite =
  Database["public"]["Tables"]["challenges"]["Row"];

export type ExploreFeedItem = {
  video: ExploreVideoRow;
  profile: ExploreProfileRow | null;
  /** Canonical avatar from `public.users.avatar_url` (not `player_profiles.avatar_url`). */
  userAvatarUrl: string | null;
  likeCount: number;
  /** Present when the video has a `challenge_id` and the challenge row loads. */
  challenge: ChallengeRowLite | null;
  /** From `ai_analyses.overall_score` when loaded (e.g. challenge leaderboard). */
  aiOverallScore?: number | null;
  /** AI + likes blend for challenge competition ranking (leaderboard sort). */
  competitionScore?: number | null;
  musicTrack?: MusicTrackSummary | null;
};

export type ExploreSort = "newest" | "most_liked" | "leaderboard";

const OUT_LIMIT = 48;
const POOL_NEWEST = 72;
const POOL_MOST_LIKED = 160;
const PROFILE_MATCH_LIMIT = 100;

/** Match home feed + RLS — any non-empty playback column qualifies. */
const PLAYABLE_VIDEO_OR =
  "video_url.not.is.null,processed_video_url.not.is.null,source_video_url.not.is.null";

function recentSinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Resolves player profile ids matching name/username and optional profile filters (AND).
 */
async function resolveProfileFilterIds(params: {
  search: string;
  position: string;
  country: string;
  city: string;
  ageMin: number | null;
  ageMax: number | null;
  preferredFoot: string;
  club: string;
}): Promise<{ ids: string[] | null; error: string | null }> {
  const searchT = params.search.trim();
  const posT = params.position.trim();
  const countryT = params.country.trim();
  const cityT = params.city.trim();
  const footT = params.preferredFoot.trim();
  const clubT = params.club.trim();

  const hasExtra =
    posT.length > 0 ||
    countryT.length > 0 ||
    cityT.length > 0 ||
    footT.length > 0 ||
    clubT.length > 0 ||
    (params.ageMin != null && Number.isFinite(params.ageMin)) ||
    (params.ageMax != null && Number.isFinite(params.ageMax));

  if (!searchT && !hasExtra) {
    return { ids: null, error: null };
  }

  const { rows: filtered, errorMessage } = await rpcFetchPublicPlayerProfilesSearch(
    supabase,
    {
      q: searchT,
      position: posT,
      country: countryT,
      city: cityT,
      preferredFoot: footT,
      club: clubT,
      ageMin: params.ageMin,
      ageMax: params.ageMax,
    },
    PROFILE_MATCH_LIMIT,
  );

  if (errorMessage) {
    logFullSupabaseError("[explore] resolveProfileFilterIds", new Error(errorMessage), {
      search: searchT,
      position: posT,
      country: countryT,
      city: cityT,
    });
    return { ids: [], error: errorMessage };
  }

  const ids = [...new Set(filtered.map((r) => r.id).filter(Boolean))] as string[];
  return { ids, error: null };
}

export async function fetchLikeCountsByVideoId(
  videoIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (videoIds.length === 0) return map;

  const chunk = 120;
  for (let i = 0; i < videoIds.length; i += chunk) {
    const slice = videoIds.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("likes")
      .select("video_id")
      .in("video_id", slice);

    if (error) {
      logFullSupabaseError("[explore] fetchLikeCountsByVideoId", error, {
        chunkSize: slice.length,
      });
      continue;
    }
    for (const row of data ?? []) {
      const vid = row.video_id;
      if (typeof vid !== "string" || vid.length === 0) continue;
      map.set(vid, (map.get(vid) ?? 0) + 1);
    }
  }
  return map;
}

/** Loads AI overall scores for public explore / challenge sorting (valid analyses only). */
export async function fetchAiOverallScoresByVideoId(
  videoIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (videoIds.length === 0) return map;
  const chunk = 120;
  for (let i = 0; i < videoIds.length; i += chunk) {
    const slice = videoIds.slice(i, i + chunk);
    const { rows, errorMessage } = await rpcFetchPublicAiScoresForVideos(supabase, slice);

    if (errorMessage) {
      logFullSupabaseError("[explore] fetchAiOverallScoresByVideoId RPC", new Error(errorMessage), {
        chunk: slice.length,
      });
      continue;
    }
    for (const [vid, sc] of publicAiScoresToMap(rows)) {
      map.set(vid, sc);
    }
  }
  return map;
}

/**
 * Global explore feed: videos + optional player profile + like counts.
 * Tuned for small payloads (limits + bounded profile match).
 */
export async function fetchExploreFeed(params: {
  search: string;
  position: string;
  country: string;
  city: string;
  ageMin: number | null;
  ageMax: number | null;
  preferredFoot: string;
  club: string;
  recentVideosOnly: boolean;
  sort: ExploreSort;
}): Promise<{
  items: ExploreFeedItem[];
  /** Matched players with no playable videos in the current result set. */
  playerMatches: ExploreProfileRow[];
  error: string | null;
}> {
  const { ids: profileIds, error: profileErr } = await resolveProfileFilterIds({
    search: params.search,
    position: params.position,
    country: params.country,
    city: params.city,
    ageMin: params.ageMin,
    ageMax: params.ageMax,
    preferredFoot: params.preferredFoot,
    club: params.club,
  });

  if (profileErr) {
    return { items: [], playerMatches: [], error: profileErr };
  }

  if (profileIds !== null && profileIds.length === 0) {
    return { items: [], playerMatches: [], error: null };
  }

  let matchedProfiles: ExploreProfileRow[] = [];
  if (profileIds !== null && profileIds.length > 0) {
    const { rows: profRows, errorMessage: matchErr } =
      await rpcFetchPublicPlayerProfilesByIds(supabase, profileIds);
    if (matchErr) {
      logFullSupabaseError("[explore] matched profile preload", new Error(matchErr), {
        profileIdsCount: profileIds.length,
      });
    } else {
      matchedProfiles = profRows;
    }
  }

  const pool =
    params.sort === "most_liked" || params.sort === "leaderboard"
      ? POOL_MOST_LIKED
      : POOL_NEWEST;

  let vq = supabase
    .from("videos")
    .select("*")
    .or(PLAYABLE_VIDEO_OR)
    .order("created_at", { ascending: false })
    .limit(pool);

  if (profileIds) {
    vq = vq.in("user_id", profileIds);
  }

  if (params.recentVideosOnly) {
    vq = vq.gte("created_at", recentSinceIso(30));
  }

  const { data: videoRows, error: vErr } = await vq;

  if (vErr) {
    logFullSupabaseError("[explore] fetchExploreFeed videos", vErr, {
      sort: params.sort,
      recentOnly: params.recentVideosOnly,
      hasProfileFilter: Boolean(profileIds),
    });
    devError("[explore] videos query failed", {
      message: supabaseErrorToUserMessage(vErr),
    });
    return {
      items: [],
      playerMatches: matchedProfiles,
      error: supabaseErrorToUserMessage(vErr),
    };
  }

  let videos = (videoRows ?? []) as ExploreVideoRow[];
  videos = videos.filter((v) => hasVideoPlaybackUrl(v));

  const userIds = [...new Set(videos.map((v) => v.user_id).filter(Boolean))];
  const avatarByUserId = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id,is_deleted,avatar_url")
      .in("id", userIds);
    if (usersErr) {
      logFullSupabaseError("[explore] users(is_deleted) filter", usersErr, {
        userIdsCount: userIds.length,
      });
      // Continue without avatar/deleted filtering — video RLS already gates inactive owners.
    } else {
      for (const u of users ?? []) {
        const v = typeof u.avatar_url === "string" ? u.avatar_url.trim() : "";
        avatarByUserId.set(u.id, v || null);
      }
      const deletedUserIds = new Set(
        (users ?? []).filter((u) => u.is_deleted).map((u) => u.id),
      );
      const activeUserIds = new Set(
        userIds.filter((id) => !deletedUserIds.has(id)),
      );
      videos = videos.filter((v) => activeUserIds.has(v.user_id));
    }
  }

  const filteredUserIds = [...new Set(videos.map((v) => v.user_id).filter(Boolean))];
  const profileByUserId = new Map<string, ExploreProfileRow>();
  if (filteredUserIds.length > 0) {
    const { rows: profRows, errorMessage: pErr } = await rpcFetchPublicPlayerProfilesByIds(
      supabase,
      filteredUserIds,
    );

    if (pErr) {
      logFullSupabaseError("[explore] fetchExploreFeed player_profiles RPC", new Error(pErr), {
        userIdsCount: filteredUserIds.length,
      });
      devWarn("[explore] profiles fetch failed — cards may lack usernames", {
        message: pErr,
      });
    } else {
      for (const p of profRows) {
        profileByUserId.set(p.id, p);
      }
    }
  }

  const videoIds = videos.map((v) => v.id).filter((id): id is string => Boolean(id));

  let aiByVideoId = new Map<string, number>();

  if (
    (params.sort === "most_liked" || params.sort === "leaderboard") &&
    videoIds.length > 0
  ) {
    const sortLikes = await fetchLikeCountsByVideoId(videoIds);
    if (params.sort === "most_liked") {
      videos = [...videos].sort((a, b) => {
        const ca = a.id ? (sortLikes.get(a.id) ?? 0) : 0;
        const cb = b.id ? (sortLikes.get(b.id) ?? 0) : 0;
        if (cb !== ca) return cb - ca;
        const ta = new Date(a.created_at ?? 0).getTime();
        const tb = new Date(b.created_at ?? 0).getTime();
        return tb - ta;
      });
    } else {
      aiByVideoId = await fetchAiOverallScoresByVideoId(videoIds);
      let maxLikes = 0;
      for (const vid of videoIds) {
        const n = sortLikes.get(vid) ?? 0;
        if (n > maxLikes) maxLikes = n;
      }
      const compById = new Map<string, number>();
      for (const v of videos) {
        const vid = v.id;
        if (!vid) continue;
        const ai = aiByVideoId.get(vid);
        const likes = sortLikes.get(vid) ?? 0;
        compById.set(vid, computeCompetitionScore(ai ?? null, likes, maxLikes));
      }
      videos = [...videos].sort((a, b) => {
        const ca = a.id ? (compById.get(a.id) ?? 0) : 0;
        const cb = b.id ? (compById.get(b.id) ?? 0) : 0;
        if (cb !== ca) return cb - ca;
        const sa = a.id ? aiByVideoId.get(a.id) : undefined;
        const sb = b.id ? aiByVideoId.get(b.id) : undefined;
        const hasA = sa !== undefined && Number.isFinite(sa);
        const hasB = sb !== undefined && Number.isFinite(sb);
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
        if (hasA && hasB && sb !== sa) return (sb as number) - (sa as number);
        const la = a.id ? (sortLikes.get(a.id) ?? 0) : 0;
        const lb = b.id ? (sortLikes.get(b.id) ?? 0) : 0;
        if (lb !== la) return lb - la;
        return (
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
      });
    }
  }

  videos = videos.slice(0, OUT_LIMIT);

  const displayIds = videos
    .map((v) => v.id)
    .filter((id): id is string => Boolean(id));
  const displayLikes =
    displayIds.length > 0 ? await fetchLikeCountsByVideoId(displayIds) : new Map<string, number>();

  const challengeIds = [
    ...new Set(
      videos
        .map((v) => v.challenge_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const challengeById = new Map<string, ChallengeRowLite>();
  if (challengeIds.length > 0) {
    const { data: chRows, error: chErr } = await withChallengeSelectFallback<ChallengeRowLite[] | null>(
      (cols) => supabase.from("challenges").select(cols).in("id", challengeIds),
    );
    if (chErr) {
      logFullSupabaseError("[explore] fetchExploreFeed challenges", chErr);
    } else {
      for (const raw of chRows ?? []) {
        const c = parseChallengeRowLoose(raw);
        if (c) challengeById.set(c.id, c);
      }
    }
  }

  let maxLikesDisplay = 0;
  if (params.sort === "leaderboard" && displayIds.length > 0) {
    for (const vid of displayIds) {
      const n = displayLikes.get(vid) ?? 0;
      if (n > maxLikesDisplay) maxLikesDisplay = n;
    }
  }

  let items: ExploreFeedItem[] = videos.map((video) => {
    const likeCount = video.id ? (displayLikes.get(video.id) ?? 0) : 0;
    const ai =
      params.sort === "leaderboard" && video.id
        ? (aiByVideoId.get(video.id) ?? null)
        : null;
    const comp =
      params.sort === "leaderboard" && video.id
        ? computeCompetitionScore(
            ai ?? null,
            likeCount,
            Math.max(1, maxLikesDisplay),
          )
        : null;
    return {
      video,
      profile: profileByUserId.get(video.user_id) ?? null,
      userAvatarUrl: avatarByUserId.get(video.user_id) ?? null,
      likeCount,
      challenge: video.challenge_id
        ? (challengeById.get(video.challenge_id) ?? null)
        : null,
      aiOverallScore: params.sort === "leaderboard" ? ai : undefined,
      competitionScore: params.sort === "leaderboard" ? comp : undefined,
    };
  });
  items = sortVideosForScouts(
    items.map((item) => ({
      ...item,
      profile: item.profile
        ? {
            ...item.profile,
            subscription_plan: item.profile.subscription_plan ?? null,
            subscription_status: item.profile.subscription_status ?? null,
            ai_overall_score: item.aiOverallScore ?? null,
            profile_completeness:
              typeof item.profile.profile_completeness === "number"
                ? item.profile.profile_completeness
                : null,
          }
        : null,
    })),
  );

  const trackIds = items.map((i) => selectedMusicTrackIdFromVideo(i.video));
  const musicMap = await fetchMusicTrackSummariesByIds(supabase, trackIds);
  const withMusic = items.map((i) => {
    const tid = selectedMusicTrackIdFromVideo(i.video);
    return {
      ...i,
      musicTrack: tid ? (musicMap.get(tid) ?? null) : null,
    };
  });

  const usersWithVideos = new Set(videos.map((v) => v.user_id).filter(Boolean));
  const playerMatches =
    profileIds !== null
      ? matchedProfiles.filter((p) => !usersWithVideos.has(p.id))
      : [];

  return { items: withMusic, playerMatches, error: null };
}
