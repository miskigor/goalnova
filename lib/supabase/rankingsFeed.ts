import { devWarn } from "@/lib/devLog";
import { rpcFetchPublicPlayerProfilesByIds } from "@/lib/supabase/publicPlayerProfiles";
import { rpcFetchPublicTopRatedAiVideos } from "@/lib/supabase/publicAiAnalyses";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { fetchLikeCountsByVideoId } from "@/lib/supabase/exploreFeed";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import {
  fetchMusicTrackSummariesByIds,
  selectedMusicTrackIdFromVideo,
  type MusicTrackSummary,
} from "@/lib/supabase/videoMusicSummary";
import {
  rankingsPreviewVideoCandidates,
  videoPlaybackUrl,
} from "@/lib/video/videoPlaybackUrl";
import {
  exploreTilePrimaryImageUrl,
  type VideoWithOptionalThumbnail,
} from "@/lib/video/exploreTileMedia";
import { GRID_VIDEO_COLUMNS } from "@/lib/video/videoListColumns";

export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];
export type PlayerProfileRow =
  Database["public"]["Tables"]["player_profiles"]["Row"];

export type RankingsListItem = {
  rank: number;
  videoId: string;
  /** First preview URL; same as `playbackSources[0]` when set. */
  videoUrl: string;
  /** Ordered URLs for inline preview (`onError` tries next). */
  playbackSources: string[];
  videoCreatedAt: string | null;
  userId: string;
  playerSlug: string;
  displayName: string;
  usernameLabel: string;
  position: string | null;
  city: string | null;
  country: string | null;
  likeCount: number;
  commentCount: number;
  overallScore: number | null;
  trendingPoints: number;
  /** First static preview URL (thumbnail/poster) for grid tiles on mobile. */
  previewStillUrl: string | null;
  musicTrack: MusicTrackSummary | null;
};

const VIDEO_POOL = 100;
const OUT_LIMIT = 50;

/** Columns needed for rankings (avoids wide `*` rows). */
const VIDEO_COLUMNS = GRID_VIDEO_COLUMNS;
const FALLBACK_PLAYER_NAME = "Player";
const FALLBACK_USERNAME_LABEL = "player";

function nonEmptyString(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

function safeNonNegativeInt(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n) && n >= 0) {
    return Math.floor(n);
  }
  return 0;
}

function safeMapCount(map: Map<string, number>, id: string): number {
  return safeNonNegativeInt(map.get(id));
}

function parseOverallScore(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

type AnalysisRow = {
  video_id: string | null;
  overall_score: unknown;
  created_at: string | null;
};

function normalizeAnalysisRows(rows: unknown[]): {
  video_id: string;
  overall_score: number | null;
  created_at: string | null;
}[] {
  const out: {
    video_id: string;
    overall_score: number | null;
    created_at: string | null;
  }[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const vid = r.video_id;
    if (typeof vid !== "string" || vid.length === 0) continue;
    out.push({
      video_id: vid,
      overall_score: parseOverallScore(r.overall_score),
      created_at: typeof r.created_at === "string" ? r.created_at : null,
    });
  }
  return out;
}

function sortAnalysesForTopRated(
  list: {
    video_id: string;
    overall_score: number | null;
    created_at: string | null;
  }[],
) {
  return [...list].sort((a, b) => {
    const as = a.overall_score;
    const bs = b.overall_score;
    if (as != null && bs != null && bs !== as) return bs - as;
    if (as != null && bs == null) return -1;
    if (as == null && bs != null) return 1;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

async function fetchCommentCountsByVideoId(
  videoIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (videoIds.length === 0) return map;
  const chunk = 120;
  for (let i = 0; i < videoIds.length; i += chunk) {
    const slice = videoIds.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("comments")
      .select("video_id")
      .in("video_id", slice);

    if (error) {
      logFullSupabaseError("[rankings] fetchCommentCountsByVideoId", error, {
        chunkSize: slice.length,
        offset: i,
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

function recencyBoost(createdAt: string | null | undefined): number {
  if (!createdAt) return 0;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return 0;
  const ageDays = Math.max(0, (Date.now() - t) / (24 * 60 * 60 * 1000));
  return Math.round(50 * Math.exp(-Math.min(ageDays, 120) / 14));
}

function trendingScore(
  likes: number,
  comments: number,
  createdAt: string | null | undefined,
): number {
  return (
    safeNonNegativeInt(likes) +
    safeNonNegativeInt(comments) +
    recencyBoost(createdAt)
  );
}

function dedupeUserIds(ids: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = nonEmptyString(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function filterVideosByActiveUsers(videos: VideoRow[]): Promise<VideoRow[]> {
  const userIds = dedupeUserIds(videos.map((v) => v.user_id));
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id,is_deleted")
    .in("id", userIds);
  if (error) {
    logFullSupabaseError("[rankings] users(is_deleted) filter", error, {
      userIdsCount: userIds.length,
    });
    // Fail-open: if users visibility is restricted by RLS, keep rankings usable.
    return videos;
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    // No visibility on `users` rows (common with strict RLS): do not hide all rankings.
    return videos;
  }
  const deleted = new Set(rows.filter((u) => u.is_deleted).map((u) => u.id));
  return videos.filter((v) => {
    const id = nonEmptyString(v.user_id);
    return Boolean(id && !deleted.has(id));
  });
}

async function loadProfilesForUserIds(
  userIds: string[],
): Promise<Map<string, PlayerProfileRow>> {
  const map = new Map<string, PlayerProfileRow>();
  const unique = dedupeUserIds(userIds);
  if (unique.length === 0) return map;

  const { rows, errorMessage } = await rpcFetchPublicPlayerProfilesByIds(supabase, unique);

  if (errorMessage) {
    logFullSupabaseError("[rankings] player_profiles RPC", new Error(errorMessage), {
      count: unique.length,
    });
    devWarn("[rankings] profiles fetch failed", errorMessage);
    return map;
  }
  for (const p of rows) {
    const id = nonEmptyString(p.id);
    if (id) map.set(id, p);
  }
  return map;
}

function buildSlug(profile: PlayerProfileRow | null, video: VideoRow): string {
  const fromProfile =
    nonEmptyString(profile?.username) || nonEmptyString(profile?.id);
  if (fromProfile) return fromProfile;
  const uid = nonEmptyString(video.user_id);
  if (uid) return uid;
  const vid = nonEmptyString(video.id);
  if (vid) return vid;
  return FALLBACK_USERNAME_LABEL;
}

function toRankItem(
  rank: number,
  video: VideoRow,
  profile: PlayerProfileRow | null,
  likeCount: number,
  commentCount: number,
  overallScore: number | null,
  trendingPoints: number,
  musicTrack: MusicTrackSummary | null,
): RankingsListItem | null {
  const id = nonEmptyString(video.id);
  const playbackSources = rankingsPreviewVideoCandidates(video);
  const url = nonEmptyString(playbackSources[0] ?? videoPlaybackUrl(video));
  if (!id || !url) return null;

  const userId =
    nonEmptyString(video.user_id) ?? (id ? `video:${id}` : "unknown");

  const displayName =
    nonEmptyString(profile?.full_name) ||
    nonEmptyString(profile?.username) ||
    nonEmptyString(profile?.id) ||
    (userId.startsWith("video:") ? FALLBACK_PLAYER_NAME : userId) ||
    FALLBACK_PLAYER_NAME;

  const usernameLabel =
    nonEmptyString(profile?.username) ||
    nonEmptyString(profile?.full_name) ||
    (userId.startsWith("video:") ? FALLBACK_USERNAME_LABEL : userId);

  return {
    rank,
    videoId: id,
    videoUrl: url,
    playbackSources:
      playbackSources.length > 0 ? playbackSources : [url].filter(Boolean),
    previewStillUrl:
      exploreTilePrimaryImageUrl(video as VideoWithOptionalThumbnail) ?? null,
    videoCreatedAt: video.created_at ?? null,
    userId,
    playerSlug: buildSlug(profile, video),
    displayName,
    usernameLabel,
    position: nonEmptyString(profile?.position),
    city:
      nonEmptyString(profile?.city) ||
      nonEmptyString(video.city),
    country:
      nonEmptyString(profile?.country) ||
      nonEmptyString(video.country),
    likeCount: safeNonNegativeInt(likeCount),
    commentCount: safeNonNegativeInt(commentCount),
    overallScore,
    trendingPoints: safeNonNegativeInt(trendingPoints),
    musicTrack,
  };
}

/**
 * Trending: likes + comments + recency decay boost.
 */
export async function fetchTrendingRankings(): Promise<{
  rows: RankingsListItem[];
  error: string | null;
}> {
  const { data: videoRows, error: vErr } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(VIDEO_POOL);

  if (vErr) {
    logFullSupabaseError("[rankings] trending videos", vErr, {
      limit: VIDEO_POOL,
    });
    return { rows: [], error: supabaseErrorToUserMessage(vErr) };
  }

  let videos = (videoRows ?? []) as VideoRow[];
  videos = await filterVideosByActiveUsers(videos);
  videos = videos.filter((v) => nonEmptyString(videoPlaybackUrl(v)));
  const videoIds = videos
    .map((v) => v.id)
    .filter((id): id is string => Boolean(nonEmptyString(id)));
  if (videoIds.length === 0) return { rows: [], error: null };

  const [likesMap, commentsMap] = await Promise.all([
    fetchLikeCountsByVideoId(videoIds),
    fetchCommentCountsByVideoId(videoIds),
  ]);

  const scored = videos.map((v) => {
    const id = nonEmptyString(v.id);
    if (!id) {
      return {
        video: v,
        likeCount: 0,
        commentCount: 0,
        trendingPoints: 0,
      };
    }
    const lc = safeMapCount(likesMap, id);
    const cc = safeMapCount(commentsMap, id);
    const tp = trendingScore(lc, cc, v.created_at);
    return { video: v, likeCount: lc, commentCount: cc, trendingPoints: tp };
  });

  scored.sort((a, b) => {
    if (b.trendingPoints !== a.trendingPoints) {
      return b.trendingPoints - a.trendingPoints;
    }
    const ta = new Date(a.video.created_at ?? 0).getTime();
    const tb = new Date(b.video.created_at ?? 0).getTime();
    return tb - ta;
  });

  const top = scored.slice(0, OUT_LIMIT);
  const userIds = dedupeUserIds(top.map((s) => s.video.user_id));
  const profileByUser = await loadProfilesForUserIds(userIds);

  const musicMap = await fetchMusicTrackSummariesByIds(
    supabase,
    top.map((s) => selectedMusicTrackIdFromVideo(s.video)),
  );

  const rows: RankingsListItem[] = [];
  let rank = 1;
  for (const s of top) {
    const ownerId = nonEmptyString(s.video.user_id);
    const profile = ownerId ? profileByUser.get(ownerId) ?? null : null;
    const tid = selectedMusicTrackIdFromVideo(s.video);
    const musicTrack = tid ? musicMap.get(tid) ?? null : null;
    const item = toRankItem(
      rank,
      s.video,
      profile,
      s.likeCount,
      s.commentCount,
      null,
      s.trendingPoints,
      musicTrack,
    );
    if (item) {
      rows.push(item);
      rank += 1;
    }
  }

  return { rows, error: null };
}

/**
 * Most liked: total likes (tie-break newer video).
 */
export async function fetchMostLikedRankings(): Promise<{
  rows: RankingsListItem[];
  error: string | null;
}> {
  const { data: videoRows, error: vErr } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(VIDEO_POOL);

  if (vErr) {
    logFullSupabaseError("[rankings] most_liked videos", vErr, {
      limit: VIDEO_POOL,
    });
    return { rows: [], error: supabaseErrorToUserMessage(vErr) };
  }

  let videos = (videoRows ?? []) as VideoRow[];
  videos = await filterVideosByActiveUsers(videos);
  videos = videos.filter((v) => nonEmptyString(videoPlaybackUrl(v)));
  const videoIds = videos
    .map((v) => v.id)
    .filter((id): id is string => Boolean(nonEmptyString(id)));
  if (videoIds.length === 0) return { rows: [], error: null };

  const [likesMap, commentsMap] = await Promise.all([
    fetchLikeCountsByVideoId(videoIds),
    fetchCommentCountsByVideoId(videoIds),
  ]);

  const scored = videos.map((v) => {
    const id = nonEmptyString(v.id);
    if (!id) {
      return {
        video: v,
        likeCount: 0,
        commentCount: 0,
        trendingPoints: 0,
      };
    }
    const lc = safeMapCount(likesMap, id);
    const cc = safeMapCount(commentsMap, id);
    const tp = trendingScore(lc, cc, v.created_at);
    return { video: v, likeCount: lc, commentCount: cc, trendingPoints: tp };
  });

  scored.sort((a, b) => {
    if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
    const ta = new Date(a.video.created_at ?? 0).getTime();
    const tb = new Date(b.video.created_at ?? 0).getTime();
    return tb - ta;
  });

  const top = scored.slice(0, OUT_LIMIT);
  const userIds = dedupeUserIds(top.map((s) => s.video.user_id));
  const profileByUser = await loadProfilesForUserIds(userIds);

  const musicMapMost = await fetchMusicTrackSummariesByIds(
    supabase,
    top.map((s) => selectedMusicTrackIdFromVideo(s.video)),
  );

  const rows: RankingsListItem[] = [];
  let rank = 1;
  for (const s of top) {
    const ownerId = nonEmptyString(s.video.user_id);
    const profile = ownerId ? profileByUser.get(ownerId) ?? null : null;
    const tid = selectedMusicTrackIdFromVideo(s.video);
    const musicTrack = tid ? musicMapMost.get(tid) ?? null : null;
    const item = toRankItem(
      rank,
      s.video,
      profile,
      s.likeCount,
      s.commentCount,
      null,
      s.trendingPoints,
      musicTrack,
    );
    if (item) {
      rows.push(item);
      rank += 1;
    }
  }

  return { rows, error: null };
}

/**
 * Top rated: highest `overall_score` on `ai_analyses` (missing or non-numeric scores sort last).
 * Videos without a row in `ai_analyses` are not listed here; trending / most liked still work without AI data.
 */
export async function fetchTopRatedRankings(): Promise<{
  rows: RankingsListItem[];
  error: string | null;
}> {
  const { rows: analysisRows, errorMessage: aErr } = await rpcFetchPublicTopRatedAiVideos(
    supabase,
    180,
  );

  if (aErr) {
    logFullSupabaseError("[rankings] top_rated ai RPC", new Error(aErr), {
      limit: 180,
    });
    return { rows: [], error: aErr };
  }

  const normalized = sortAnalysesForTopRated(
    normalizeAnalysisRows(
      analysisRows.map((row) => ({
        video_id: row.video_id,
        overall_score: row.overall_score,
        created_at: row.created_at,
      })) as AnalysisRow[],
    ),
  );

  const seen = new Set<string>();
  const ordered: typeof normalized = [];
  for (const a of normalized) {
    if (seen.has(a.video_id)) continue;
    seen.add(a.video_id);
    ordered.push(a);
    if (ordered.length >= OUT_LIMIT) break;
  }

  const videoIds = ordered.map((a) => a.video_id);
  if (videoIds.length === 0) return { rows: [], error: null };

  const { data: videoRows, error: vErr } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .in("id", videoIds);

  if (vErr) {
    logFullSupabaseError("[rankings] top_rated videos", vErr, {
      videoCount: videoIds.length,
    });
    return { rows: [], error: supabaseErrorToUserMessage(vErr) };
  }

  const visibleVideos = await filterVideosByActiveUsers((videoRows ?? []) as VideoRow[]);
  const videoById = new Map<string, VideoRow>();
  for (const v of visibleVideos) {
    const id = nonEmptyString(v.id);
    if (id) videoById.set(id, v);
  }

  const [likesMap, commentsMap] = await Promise.all([
    fetchLikeCountsByVideoId(videoIds),
    fetchCommentCountsByVideoId(videoIds),
  ]);

  const userIds = dedupeUserIds(
    ordered.map((a) => videoById.get(a.video_id)?.user_id),
  );
  const profileByUser = await loadProfilesForUserIds(userIds);

  const musicMapTop = await fetchMusicTrackSummariesByIds(
    supabase,
    ordered.map((a) => selectedMusicTrackIdFromVideo(videoById.get(a.video_id))),
  );

  const rows: RankingsListItem[] = [];
  let rank = 1;
  for (const a of ordered) {
    const video = videoById.get(a.video_id);
    if (!video || !nonEmptyString(videoPlaybackUrl(video))) {
      devWarn("[rankings] top_rated skip missing video", {
        videoId: a.video_id,
      });
      continue;
    }
    const ownerId = nonEmptyString(video.user_id);
    const profile = ownerId ? profileByUser.get(ownerId) ?? null : null;
    const lc = safeMapCount(likesMap, a.video_id);
    const cc = safeMapCount(commentsMap, a.video_id);
    const tp = trendingScore(lc, cc, video.created_at);
    const tid = selectedMusicTrackIdFromVideo(video);
    const musicTrack = tid ? musicMapTop.get(tid) ?? null : null;
    const item = toRankItem(
      rank,
      video,
      profile,
      lc,
      cc,
      a.overall_score,
      tp,
      musicTrack,
    );
    if (item) {
      rows.push(item);
      rank += 1;
    }
  }

  return { rows, error: null };
}

export type RankingsTab = "trending" | "top_rated" | "most_liked";

export async function fetchRankings(
  tab: RankingsTab,
): Promise<{ rows: RankingsListItem[]; error: string | null }> {
  switch (tab) {
    case "trending":
      return fetchTrendingRankings();
    case "most_liked":
      return fetchMostLikedRankings();
    case "top_rated":
      return fetchTopRatedRankings();
    default:
      return fetchTrendingRankings();
  }
}
