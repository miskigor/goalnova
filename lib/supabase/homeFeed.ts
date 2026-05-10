import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/client";
import {
  CHALLENGE_SELECT_COLUMN_FALLBACKS,
  withChallengeSelectFallback,
  parseChallengeRowLoose,
  type ChallengeRow,
} from "@/lib/challenges/challengeRowUtils";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import {
  fetchMusicTrackSummariesByIds,
  selectedMusicTrackIdFromVideo,
  type MusicTrackSummary,
} from "@/lib/supabase/videoMusicSummary";

export type HomeFeedVideo = Database["public"]["Tables"]["videos"]["Row"];
export type HomeFeedPlayerProfile =
  Database["public"]["Tables"]["player_profiles"]["Row"];

export type HomeFeedChallenge = ChallengeRow;

export type HomeFeedItem = {
  video: HomeFeedVideo;
  profile: HomeFeedPlayerProfile | null;
  /** Fallback display name from users table when profile fields are empty. */
  userDisplayName: string | null;
  /** Canonical avatar from `public.users.avatar_url` (not `player_profiles.avatar_url`). */
  userAvatarUrl: string | null;
  challenge: HomeFeedChallenge | null;
  /** Resolved when `video.selected_music_track_id` is set (metadata MVP). */
  musicTrack?: MusicTrackSummary | null;
};

/** Precomputed counts / AI for verified-scout discovery cards (optional). */
export type ScoutFeedMetrics = {
  likesCount: number;
  commentsCount: number;
  aiOverallScore: number | null;
};

export type AugmentedHomeFeedItem = HomeFeedItem & {
  scoutMetrics?: ScoutFeedMetrics;
};

/** Cap rows from `videos` — avoids downloading the full table on home (mobile cold start). */
export const HOME_FEED_VIDEO_QUERY_LIMIT = 40;

/** Batch-load `public.users.avatar_url` for feed cards. */
export async function fetchUserAvatarUrlsByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, string | null>();
  if (ids.length === 0) return out;

  const { data, error } = await supabase
    .from("users")
    .select("id, avatar_url")
    .in("id", ids);

  if (error) {
    logFullSupabaseError("[PitchRusch home feed] users avatar_url batch select", error, {
      idsCount: ids.length,
    });
    return out;
  }

  for (const row of data ?? []) {
    const v = typeof row.avatar_url === "string" ? row.avatar_url.trim() : "";
    out.set(row.id, v || null);
  }
  return out;
}

type NormalizedVideo = { video: HomeFeedVideo; embedChallenge: HomeFeedChallenge | null };

function isMissingUsersScoutApplyFullNameColumn(error: unknown): boolean {
  const e = error as { code?: string | null; message?: string | null };
  if (e?.code !== "PGRST204") return false;
  const m = (e.message ?? "").toLowerCase();
  return m.includes("scout_apply_full_name") && m.includes("users");
}

function isMissingUsersIsDeletedColumn(error: unknown): boolean {
  const e = error as { code?: string | null; message?: string | null };
  if (e?.code !== "PGRST204") return false;
  const m = (e.message ?? "").toLowerCase();
  return m.includes("is_deleted") && m.includes("users");
}

/** Non-empty trimmed URL on at least one playable column (feeds may rely on processed-only assets). */
function rowHasPlayableVideoUrl(row: Record<string, unknown>): boolean {
  const uv = typeof row.video_url === "string" ? row.video_url.trim() : "";
  const pv =
    typeof row.processed_video_url === "string"
      ? row.processed_video_url.trim()
      : "";
  const sv =
    typeof row.source_video_url === "string" ? row.source_video_url.trim() : "";
  return Boolean(uv || pv || sv);
}

function normalizeHomeFeedVideoRows(
  rows: Record<string, unknown>[],
  hasEmbeddedChallenge: boolean,
): NormalizedVideo[] {
  return rows.map((row) => {
    if (!hasEmbeddedChallenge) {
      return { video: row as HomeFeedVideo, embedChallenge: null };
    }
    const { challenge: rawC, ...rest } = row;
    const video = rest as HomeFeedVideo;
    let embedChallenge: HomeFeedChallenge | null = null;
    if (rawC && typeof rawC === "object") {
      const candidate = Array.isArray(rawC) ? rawC[0] : rawC;
      embedChallenge = parseChallengeRowLoose(candidate);
      if (rawC && video.challenge_id && !embedChallenge) {
        logFullSupabaseError(
          "[PitchRusch home feed] embedded challenge payload could not be parsed",
          new Error("parseChallengeRowLoose returned null"),
          { videoId: video.id, challenge_id: video.challenge_id },
        );
      }
    }
    return { video, embedChallenge };
  });
}

/**
 * Loads global highlight feed: all videos, player profiles, and optional challenges.
 * Prefers videos+challenge embed with full challenge columns; retries with fewer columns on
 * older DBs (no `slug`, no structured reward columns), then falls back to separate queries.
 */
export async function fetchHomeFeedData(
  supabase: SupabaseClient<Database>,
): Promise<{ items: HomeFeedItem[]; error: string | null }> {
  let rawRows: Record<string, unknown>[] = [];
  let usedEmbed = false;
  let lastEmbedError: unknown | null = null;
  let lastEmbedColumns: string | null = null;

  for (const cols of CHALLENGE_SELECT_COLUMN_FALLBACKS) {
    const { data: embedded, error: embedError } = await supabase
      .from("videos")
      .select(
        `*,
        challenge:challenges!videos_challenge_id_fkey (${cols})`,
      )
      .or(
        "video_url.not.is.null,processed_video_url.not.is.null,source_video_url.not.is.null",
      )
      .order("created_at", { ascending: false })
      .limit(HOME_FEED_VIDEO_QUERY_LIMIT);

    if (!embedError) {
      usedEmbed = true;
      rawRows = (embedded ?? []).filter((r) =>
        rowHasPlayableVideoUrl(r as Record<string, unknown>),
      ) as Record<string, unknown>[];
      break;
    }
    lastEmbedError = embedError;
    lastEmbedColumns = cols;
  }

  if (!usedEmbed) {
    if (lastEmbedError) {
      logFullSupabaseError(
        "[PitchRusch home feed] videos+challenge embed query failed — check public.challenges columns match (id, slug, title, description, created_at)",
        lastEmbedError,
        { challengeColumns: lastEmbedColumns },
      );
    }
    const { data: videos, error: videosError } = await supabase
      .from("videos")
      .select("*")
      .or(
        "video_url.not.is.null,processed_video_url.not.is.null,source_video_url.not.is.null",
      )
      .order("created_at", { ascending: false })
      .limit(HOME_FEED_VIDEO_QUERY_LIMIT);

    if (videosError) {
      logFullSupabaseError("[PitchRusch home feed] videos select error", videosError);
      return {
        items: [],
        error: supabaseErrorToUserMessage(videosError),
      };
    }
    rawRows = (videos ?? []).filter((r) =>
      rowHasPlayableVideoUrl(r as Record<string, unknown>),
    ) as Record<string, unknown>[];
  }

  const normalized = normalizeHomeFeedVideoRows(rawRows, usedEmbed);
  const initialUserIds = [
    ...new Set(
      normalized.map((n) => n.video.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];
  let activeUserIds = new Set<string>(initialUserIds);
  const userDisplayNameByUserId = new Map<string, string | null>();
  if (initialUserIds.length > 0) {
    const primary = await supabase
      .from("users")
      .select("id,is_deleted,scout_apply_full_name")
      .in("id", initialUserIds);
    let usersErr = primary.error;
    let userRows: Array<{
      id: string;
      is_deleted?: boolean;
      scout_apply_full_name?: string | null;
    }> = (primary.data ?? []) as Array<{
      id: string;
      is_deleted?: boolean;
      scout_apply_full_name?: string | null;
    }>;
    if (usersErr && isMissingUsersScoutApplyFullNameColumn(usersErr)) {
      // Backward compatibility for DBs missing scout_apply_full_name.
      const fallback = await supabase
        .from("users")
        .select("id,is_deleted")
        .in("id", initialUserIds);
      userRows = (fallback.data ?? []) as Array<{
        id: string;
        is_deleted?: boolean;
      }>;
      usersErr = fallback.error;
    }
    if (usersErr && isMissingUsersIsDeletedColumn(usersErr)) {
      // Backward compatibility for DBs missing users.is_deleted.
      const fallback = await supabase.from("users").select("id").in("id", initialUserIds);
      userRows = (fallback.data ?? []) as Array<{
        id: string;
      }>;
      usersErr = fallback.error;
    }
    if (usersErr) {
      logFullSupabaseError("[PitchRusch home feed] users(is_deleted) filter", usersErr, {
        idsCount: initialUserIds.length,
      });
      // Keep feed usable instead of failing the whole page if a non-critical users
      // projection is unavailable due schema drift.
      activeUserIds = new Set(initialUserIds);
      userRows = [];
      usersErr = null;
    }
    const deletedUserIds = new Set(userRows.filter((u) => u.is_deleted).map((u) => u.id));
    for (const u of userRows) {
      const name =
        typeof u.scout_apply_full_name === "string"
          ? u.scout_apply_full_name.trim()
          : "";
      userDisplayNameByUserId.set(u.id, name || null);
    }
    activeUserIds = new Set(
      initialUserIds.filter((id) => !deletedUserIds.has(id)),
    );
  }
  const visibleNormalized = normalized.filter((n) => activeUserIds.has(n.video.user_id));

  const userIds = [
    ...new Set(
      visibleNormalized.map((n) => n.video.user_id).filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileByUserId = new Map<string, HomeFeedPlayerProfile>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("player_profiles")
      .select("*")
      .in("id", userIds);

    if (profilesError) {
      logFullSupabaseError(
        "[PitchRusch home feed] player_profiles select error",
        profilesError,
        { userIdsCount: userIds.length },
      );
    } else {
      for (const p of profiles ?? []) {
        profileByUserId.set(p.id, p);
      }
    }
  }

  const avatarByUserId = await fetchUserAvatarUrlsByUserIds(supabase, userIds);

  const items: HomeFeedItem[] = visibleNormalized.map(({ video, embedChallenge }) => {
    const profile = profileByUserId.get(video.user_id) ?? null;
    const uid = video.user_id?.trim() || "";
    const userDisplayName = uid ? (userDisplayNameByUserId.get(uid) ?? null) : null;
    const userAvatarUrl = uid ? (avatarByUserId.get(uid) ?? null) : null;
    const challenge = embedChallenge ?? null;
    return { video, profile, userDisplayName, userAvatarUrl, challenge };
  });

  const withChallenges = await attachChallengesToHomeFeedItems(supabase, items);

  const trackIds = withChallenges.map((i) =>
    selectedMusicTrackIdFromVideo(i.video),
  );
  const musicMap = await fetchMusicTrackSummariesByIds(supabase, trackIds);
  const merged = withChallenges.map((i) => {
    const tid = selectedMusicTrackIdFromVideo(i.video);
    return {
      ...i,
      musicTrack: tid ? (musicMap.get(tid) ?? null) : null,
    };
  });

  return { items: merged, error: null };
}

/**
 * Fetches challenge rows for any feed item that has `challenge_id` but no `challenge` yet.
 */
export async function attachChallengesToHomeFeedItems<T extends HomeFeedItem>(
  supabase: SupabaseClient<Database>,
  items: T[],
): Promise<T[]> {
  const challengeById = new Map<string, HomeFeedChallenge>();

  const idsNeedingFetch = [
    ...new Set(
      items
        .filter(({ video, challenge }) => Boolean(video.challenge_id) && !challenge)
        .map(({ video }) => video.challenge_id as string),
    ),
  ];

  if (idsNeedingFetch.length > 0) {
    const { data: chRows, error: chErr } = await withChallengeSelectFallback<ChallengeRow[] | null>((cols) =>
      supabase.from("challenges").select(cols).in("id", idsNeedingFetch),
    );
    if (chErr) {
      logFullSupabaseError(
        "[PitchRusch home feed] challenges batch select error (feed continues without pills)",
        chErr,
        { requestedIds: idsNeedingFetch.length },
      );
    } else {
      for (const raw of chRows ?? []) {
        const c = parseChallengeRowLoose(raw);
        if (c) {
          challengeById.set(c.id, c);
        }
      }
    }
  }

  return items.map((item) => {
    if (item.challenge || !item.video.challenge_id) {
      return item;
    }
    const c = challengeById.get(item.video.challenge_id) ?? null;
    return { ...item, challenge: c };
  }) as T[];
}
