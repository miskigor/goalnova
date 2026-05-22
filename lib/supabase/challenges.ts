import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  parseChallengeRowLoose,
  withChallengeSelectFallback,
  type ChallengeRow,
} from "@/lib/challenges/challengeRowUtils";
import { devWarn } from "@/lib/devLog";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import {
  fetchAiOverallScoresByVideoId,
  fetchLikeCountsByVideoId,
  type ExploreFeedItem,
  type ExploreSort,
} from "@/lib/supabase/exploreFeed";
import { competitionScore as computeCompetitionScore } from "@/lib/challenges/challengeCompetitionScore";
import { hasVideoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";

export type { ChallengeRow } from "@/lib/challenges/challengeRowUtils";
export {
  CHALLENGE_SELECT_COLUMNS,
  CHALLENGE_SELECT_COLUMNS_NO_SLUG,
  CHALLENGE_SELECT_COLUMN_FALLBACKS,
  withChallengeSelectFallback,
  challengeDisplayTitle,
  challengeLinkSegment,
  parseChallengeRowLoose,
} from "@/lib/challenges/challengeRowUtils";

export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];

const CHALLENGE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Batch-load challenges by id (deduped). */
/**
 * Load one challenge for upload UI (title, description, optional `rules` column if present).
 */
export async function fetchChallengeForUploadContext(
  challengeId: string,
): Promise<{
  row: ChallengeRow | null;
  rules: string | null;
  error: string | null;
}> {
  const id = challengeId.trim();
  if (!id) {
    return { row: null, rules: null, error: null };
  }

  const byId = CHALLENGE_UUID_RE.test(id);
  const q = supabase.from("challenges").select("*").eq("status", "active");
  const { data, error } = await (byId ? q.eq("id", id) : q.eq("slug", id)).maybeSingle();

  if (error) {
    logFullSupabaseError("[challenges] fetchChallengeForUploadContext", error, {
      id,
    });
    return {
      row: null,
      rules: null,
      error: supabaseErrorToUserMessage(error),
    };
  }

  const row = parseChallengeRowLoose(data);
  const raw = data as Record<string, unknown> | null;
  const rulesRaw = raw?.rules;
  const rules =
    typeof rulesRaw === "string" && rulesRaw.trim().length > 0
      ? rulesRaw.trim()
      : null;

  return { row, rules, error: null };
}

export async function fetchChallengesByIds(
  ids: string[],
): Promise<Map<string, ChallengeRow>> {
  const map = new Map<string, ChallengeRow>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .in("id", unique);

  if (error) {
    logFullSupabaseError("[challenges] fetchChallengesByIds", error, {
      count: unique.length,
    });
    return map;
  }
  for (const row of data ?? []) {
    const parsed = parseChallengeRowLoose(row);
    if (parsed) map.set(parsed.id, parsed);
  }
  return map;
}

/** Challenges players can still join (upload). */
export async function fetchActiveChallengesOrdered(): Promise<{
  challenges: ChallengeRow[];
  error: string | null;
}> {
  const { data, error } = await withChallengeSelectFallback<ChallengeRow[] | null>((cols) =>
    supabase
      .from("challenges")
      .select(cols)
      .eq("status", "active")
      .order("expires_at", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true }),
  );

  if (error) {
    logFullSupabaseError("[challenges] fetchActiveChallengesOrdered", error);
    return {
      challenges: [],
      error: supabaseErrorToUserMessage(error),
    };
  }
  const challenges: ChallengeRow[] = [];
  for (const row of data ?? []) {
    const c = parseChallengeRowLoose(row);
    if (c) challenges.push(c);
  }
  return { challenges, error: null };
}

export async function fetchAllChallengesOrdered(): Promise<{
  challenges: ChallengeRow[];
  error: string | null;
}> {
  const { data, error } = await withChallengeSelectFallback<ChallengeRow[] | null>((cols) =>
    supabase
      .from("challenges")
      .select(cols)
      .in("status", ["active", "ended"])
      .order("status", { ascending: true })
      .order("expires_at", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true }),
  );

  if (error) {
    logFullSupabaseError("[challenges] fetchAllChallengesOrdered", error);
    return {
      challenges: [],
      error: supabaseErrorToUserMessage(error),
    };
  }
  const challenges: ChallengeRow[] = [];
  for (const row of data ?? []) {
    const c = parseChallengeRowLoose(row);
    if (c) challenges.push(c);
  }
  return { challenges, error: null };
}

export async function fetchChallengeBySlug(
  slug: string,
): Promise<{ challenge: ChallengeRow | null; error: string | null }> {
  const s = slug.trim();
  if (!s) return { challenge: null, error: null };

  const { data, error } = await withChallengeSelectFallback<ChallengeRow | null>((cols) =>
    supabase
      .from("challenges")
      .select(cols)
      .eq("slug", s)
      .in("status", ["active", "ended"])
      .maybeSingle(),
  );

  if (error) {
    logFullSupabaseError("[challenges] fetchChallengeBySlug", error, { slug: s });
    return { challenge: null, error: supabaseErrorToUserMessage(error) };
  }
  const row = parseChallengeRowLoose(data);
  return { challenge: row, error: null };
}

/**
 * Resolves a challenge from the `[slug]` route param: UUID → lookup by id, else by slug.
 */
export async function fetchChallengeBySlugOrId(
  param: string,
): Promise<{ challenge: ChallengeRow | null; error: string | null }> {
  const s = param.trim();
  if (!s) return { challenge: null, error: null };

  if (CHALLENGE_UUID_RE.test(s)) {
    const { data, error } = await withChallengeSelectFallback<ChallengeRow | null>((cols) =>
      supabase
        .from("challenges")
        .select(cols)
        .eq("id", s)
        .in("status", ["active", "ended"])
        .maybeSingle(),
    );

    if (error) {
      logFullSupabaseError(
        "[challenges] fetchChallengeBySlugOrId — lookup by id failed",
        error,
        { id: s },
      );
      return { challenge: null, error: supabaseErrorToUserMessage(error) };
    }
    const byId = parseChallengeRowLoose(data);
    if (byId) {
      return { challenge: byId, error: null };
    }
    devWarn(
      "[challenges] fetchChallengeBySlugOrId — no row for id, trying slug match",
      { id: s },
    );
  }

  return fetchChallengeBySlug(s);
}

/** Count videos per challenge_id in one round trip. */
export async function fetchVideoCountsByChallengeId(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const { data, error } = await supabase
    .from("videos")
    .select("challenge_id")
    .not("challenge_id", "is", null);

  if (error) {
    logFullSupabaseError("[challenges] fetchVideoCountsByChallengeId", error);
    return map;
  }
  for (const row of data ?? []) {
    const cid = row.challenge_id as string | null;
    if (cid) map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
}

export type ChallengePreviewVideo = Pick<
  VideoRow,
  | "id"
  | "video_url"
  | "processed_video_url"
  | "source_video_url"
  | "created_at"
  | "user_id"
  | "caption"
>;

export type ChallengeTopPreview = ChallengePreviewVideo & { likeCount: number };

/** Latest uploads for a challenge (by created_at). */
export async function fetchLatestVideosForChallenge(
  challengeId: string,
  limit: number,
): Promise<ChallengePreviewVideo[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("id, video_url, processed_video_url, source_video_url, created_at, user_id, caption")
    .eq("challenge_id", challengeId)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logFullSupabaseError("[challenges] fetchLatestVideosForChallenge", error, {
      challengeId,
    });
    return [];
  }
  return (data ?? []) as ChallengePreviewVideo[];
}

const TOP_VIDEO_POOL = 96;

/**
 * Top clips by like count (then recency) for hub previews.
 */
export async function fetchTopVideosForChallenge(
  challengeId: string,
  limit: number,
): Promise<ChallengeTopPreview[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("id, video_url, processed_video_url, source_video_url, created_at, user_id, caption")
    .eq("challenge_id", challengeId)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(TOP_VIDEO_POOL);

  if (error) {
    logFullSupabaseError("[challenges] fetchTopVideosForChallenge", error, {
      challengeId,
    });
    return [];
  }

  let rows = (data ?? []) as ChallengePreviewVideo[];
  rows = rows.filter((r) => hasVideoPlaybackUrl(r));
  const ids = rows.map((r) => r.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  const likes = await fetchLikeCountsByVideoId(ids);
  rows = [...rows].sort((a, b) => {
    const la = a.id ? (likes.get(a.id) ?? 0) : 0;
    const lb = b.id ? (likes.get(b.id) ?? 0) : 0;
    if (lb !== la) return lb - la;
    return (
      new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
  });

  const top = rows.slice(0, limit);
  return top.map((v) => ({
    ...v,
    likeCount: v.id ? (likes.get(v.id) ?? 0) : 0,
  }));
}

export type ChallengeAiHighlight = {
  challengeId: string;
  videoId: string;
  overallScore: number;
};

/**
 * Highest `overall_score` per challenge among analyzed public challenge clips.
 * Requires RLS policy allowing read on `ai_analyses` for those videos (see migration).
 */
export async function fetchBestAiHighlightsForChallenges(
  challengeIds: string[],
): Promise<Map<string, ChallengeAiHighlight>> {
  const result = new Map<string, ChallengeAiHighlight>();
  const ids = [...new Set(challengeIds.filter(Boolean))];
  if (ids.length === 0) return result;

  const { data: vrows, error: vErr } = await supabase
    .from("videos")
    .select("id, challenge_id")
    .in("challenge_id", ids)
    .not("video_url", "is", null)
    .not("challenge_id", "is", null);

  if (vErr) {
    logFullSupabaseError("[challenges] fetchBestAiHighlights videos", vErr);
    return result;
  }

  const videoIdToChallenge = new Map<string, string>();
  const videoIds: string[] = [];
  for (const r of vrows ?? []) {
    const vid = r.id as string | undefined;
    const cid = r.challenge_id as string | undefined;
    if (vid && cid) {
      videoIdToChallenge.set(vid, cid);
      videoIds.push(vid);
    }
  }
  if (videoIds.length === 0) return result;

  const chunk = 120;
  for (let i = 0; i < videoIds.length; i += chunk) {
    const slice = videoIds.slice(i, i + chunk);
    const { data: arows, error: aErr } = await supabase
      .from("ai_analyses")
      .select("video_id, overall_score, valid_for_football_analysis")
      .in("video_id", slice);

    if (aErr) {
      logFullSupabaseError("[challenges] fetchBestAiHighlights ai_analyses", aErr, {
        chunk: slice.length,
      });
      continue;
    }

    for (const row of arows ?? []) {
      const vid = row.video_id as string;
      const cid = videoIdToChallenge.get(vid);
      if (!cid) continue;
      if (row.valid_for_football_analysis === false) continue;
      const score = Number(row.overall_score);
      if (!Number.isFinite(score)) continue;
      const prev = result.get(cid);
      if (!prev || score > prev.overallScore) {
        result.set(cid, {
          challengeId: cid,
          videoId: vid,
          overallScore: Math.round(score),
        });
      }
    }
  }

  return result;
}

/**
 * Videos for a challenge with profiles + like counts (same shape as explore items).
 * `leaderboard`: highest AI overall_score, then likes, then newest.
 */
export async function fetchChallengeFeed(params: {
  challengeId: string;
  sort: ExploreSort;
}): Promise<{ items: ExploreFeedItem[]; error: string | null }> {
  const POOL =
    params.sort === "most_liked" || params.sort === "leaderboard" ? 160 : 96;

  const { data: videoRows, error: vErr } = await supabase
    .from("videos")
    .select("*")
    .eq("challenge_id", params.challengeId)
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(POOL);

  if (vErr) {
    logFullSupabaseError("[challenges] fetchChallengeFeed videos", vErr, {
      challengeId: params.challengeId,
    });
    return { items: [], error: supabaseErrorToUserMessage(vErr) };
  }

  type EV = Database["public"]["Tables"]["videos"]["Row"];
  let videos = (videoRows ?? []) as EV[];
  videos = videos.filter((v) => hasVideoPlaybackUrl(v));

  const userIds = [...new Set(videos.map((v) => v.user_id).filter(Boolean))];
  const profileByUserId = new Map<
    string,
    Database["public"]["Tables"]["player_profiles"]["Row"]
  >();
  const avatarByUserId = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: userRows, error: uErr } = await supabase
      .from("users")
      .select("id,avatar_url")
      .in("id", userIds);
    if (uErr) {
      logFullSupabaseError("[challenges] fetchChallengeFeed users avatar_url", uErr);
    } else {
      for (const u of userRows ?? []) {
        const v = typeof u.avatar_url === "string" ? u.avatar_url.trim() : "";
        avatarByUserId.set(u.id, v || null);
      }
    }

    const { data: profRows, error: pErr } = await supabase
      .from("player_profiles")
      .select("*")
      .in("id", userIds);

    if (pErr) {
      logFullSupabaseError("[challenges] fetchChallengeFeed player_profiles", pErr);
    } else {
      for (const p of (profRows ?? []) as Database["public"]["Tables"]["player_profiles"]["Row"][]) {
        profileByUserId.set(p.id, p);
      }
    }
  }

  const videoIds = videos.map((v) => v.id).filter((id): id is string => Boolean(id));

  const likesForSort =
    videoIds.length > 0 ? await fetchLikeCountsByVideoId(videoIds) : new Map<string, number>();

  const aiByVideoId =
    params.sort === "leaderboard" && videoIds.length > 0
      ? await fetchAiOverallScoresByVideoId(videoIds)
      : new Map<string, number>();

  if (params.sort === "most_liked" && videoIds.length > 0) {
    videos = [...videos].sort((a, b) => {
      const ca = a.id ? (likesForSort.get(a.id) ?? 0) : 0;
      const cb = b.id ? (likesForSort.get(b.id) ?? 0) : 0;
      if (cb !== ca) return cb - ca;
      const ta = new Date(a.created_at ?? 0).getTime();
      const tb = new Date(b.created_at ?? 0).getTime();
      return tb - ta;
    });
  } else if (params.sort === "leaderboard" && videoIds.length > 0) {
    let maxLikes = 0;
    for (const vid of videoIds) {
      const n = likesForSort.get(vid) ?? 0;
      if (n > maxLikes) maxLikes = n;
    }
    const compById = new Map<string, number>();
    for (const v of videos) {
      const vid = v.id;
      if (!vid) continue;
      const ai = aiByVideoId.get(vid);
      const likes = likesForSort.get(vid) ?? 0;
      compById.set(
        vid,
        computeCompetitionScore(ai ?? null, likes, maxLikes),
      );
    }
    videos = [...videos].sort((a, b) => {
      const ca = a.id ? compById.get(a.id) ?? 0 : 0;
      const cb = b.id ? compById.get(b.id) ?? 0 : 0;
      if (cb !== ca) return cb - ca;
      const sa = a.id ? aiByVideoId.get(a.id) : undefined;
      const sb = b.id ? aiByVideoId.get(b.id) : undefined;
      const hasA = sa !== undefined && Number.isFinite(sa);
      const hasB = sb !== undefined && Number.isFinite(sb);
      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;
      if (hasA && hasB && sb !== sa) return (sb as number) - (sa as number);
      const la = a.id ? (likesForSort.get(a.id) ?? 0) : 0;
      const lb = b.id ? (likesForSort.get(b.id) ?? 0) : 0;
      if (lb !== la) return lb - la;
      return (
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    });
  }

  videos = videos.slice(0, 48);

  const displayIds = videos.map((v) => v.id).filter((id): id is string => Boolean(id));
  const displayLikes =
    displayIds.length > 0 ? await fetchLikeCountsByVideoId(displayIds) : new Map<string, number>();

  const challengeMap = await fetchChallengesByIds([params.challengeId]);
  const challenge = challengeMap.get(params.challengeId) ?? null;

  let maxLikesDisplay = 0;
  if (params.sort === "leaderboard" && displayIds.length > 0) {
    for (const vid of displayIds) {
      const n = displayLikes.get(vid) ?? 0;
      if (n > maxLikesDisplay) maxLikesDisplay = n;
    }
  }

  const items: ExploreFeedItem[] = videos.map((video) => {
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
      challenge,
      aiOverallScore: params.sort === "leaderboard" ? ai : null,
      competitionScore: params.sort === "leaderboard" ? comp : null,
    };
  });

  return { items, error: null };
}

export type ChallengePodiumResult = {
  items: ExploreFeedItem[];
  source: "manual" | "computed" | "none";
};

/** Top 3 for ended challenges: manual `challenge_winners` rows override computed ranking. */
export async function fetchChallengePodium(params: {
  challengeId: string;
  challengeStatus: string;
}): Promise<ChallengePodiumResult> {
  const cid = params.challengeId.trim();
  if (!cid) return { items: [], source: "none" };

  const { data: wrows, error: wErr } = await supabase
    .from("challenge_winners")
    .select("video_id, rank")
    .eq("challenge_id", cid)
    .eq("placement_source", "manual")
    .order("rank", { ascending: true });

  if (!wErr && wrows && wrows.length > 0) {
    const { items: all, error } = await fetchChallengeFeed({
      challengeId: cid,
      sort: "leaderboard",
    });
    if (error) return { items: [], source: "none" };
    const map = new Map(
      all
        .filter((i) => i.video.id)
        .map((i) => [i.video.id as string, i]),
    );
    const ordered: ExploreFeedItem[] = [];
    for (const r of wrows) {
      const vid = r.video_id as string;
      const it = map.get(vid);
      if (it) ordered.push(it);
    }
    if (ordered.length > 0) {
      return { items: ordered.slice(0, 3), source: "manual" };
    }
  }

  if (params.challengeStatus === "ended") {
    const { items, error } = await fetchChallengeFeed({
      challengeId: cid,
      sort: "leaderboard",
    });
    if (error || items.length === 0) return { items: [], source: "none" };
    return { items: items.slice(0, 3), source: "computed" };
  }

  return { items: [], source: "none" };
}
