import { supabase } from "./client";
import {
  logFullSupabaseError,
  supabaseErrorToUserMessage,
} from "./logError";
import { scheduleFollowNotification } from "./notifications";

const PG_UNIQUE_VIOLATION = "23505";

export type FollowCountsResult = {
  /** `null` when the followers query failed (keep prior UI or show "—"). */
  followers: number | null;
  /** `null` when the following query failed. */
  following: number | null;
  followersError: string | null;
  followingError: string | null;
};

function isUniqueOrDuplicateFollowError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === PG_UNIQUE_VIOLATION) return true;
  const msg = typeof e.message === "string" ? e.message : "";
  return /duplicate key|unique constraint|already exists/i.test(msg);
}

/**
 * Loads follower and following counts independently so one failing request
 * does not discard the other.
 */
export async function fetchFollowCountsForUser(
  userId: string
): Promise<FollowCountsResult> {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  let followersError: string | null = null;
  let followingError: string | null = null;

  if (followersRes.error) {
    logFullSupabaseError("Follows: count followers", followersRes.error, {
      following_id: userId,
    });
    followersError = supabaseErrorToUserMessage(followersRes.error);
  }

  if (followingRes.error) {
    logFullSupabaseError("Follows: count following", followingRes.error, {
      follower_id: userId,
    });
    followingError = supabaseErrorToUserMessage(followingRes.error);
  }

  return {
    followers: followersRes.error ? null : (followersRes.count ?? 0),
    following: followingRes.error ? null : (followingRes.count ?? 0),
    followersError,
    followingError,
  };
}

export async function checkIsFollowing(
  followerId: string,
  followingId: string
): Promise<{ isFollowing: boolean; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("Follows: checkIsFollowing", error, {
      follower_id: followerId,
      following_id: followingId,
    });
    return { isFollowing: false, errorMessage: supabaseErrorToUserMessage(error) };
  }

  return { isFollowing: Boolean(data?.id), errorMessage: null };
}

export type FollowUserResult =
  | { ok: true; errorMessage: null; duplicate: boolean }
  | { ok: false; errorMessage: string; duplicate?: false };

export async function followUser(
  followerId: string,
  followingId: string
): Promise<FollowUserResult> {
  if (followerId === followingId) {
    return { ok: false, errorMessage: "Cannot follow yourself." };
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) {
    if (isUniqueOrDuplicateFollowError(error)) {
      return { ok: true, errorMessage: null, duplicate: true };
    }
    logFullSupabaseError("Follows: followUser insert", error, {
      follower_id: followerId,
      following_id: followingId,
    });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(error) };
  }

  scheduleFollowNotification(followerId, followingId);
  return { ok: true, errorMessage: null, duplicate: false };
}

/**
 * Removes a follow row if it exists. PostgREST returns success when zero rows
 * are deleted, so this is safe to call when not following (idempotent).
 */
export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<{ ok: boolean; errorMessage: string | null }> {
  if (followerId === followingId) {
    return { ok: false, errorMessage: "Cannot unfollow yourself." };
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) {
    logFullSupabaseError("Follows: unfollowUser delete", error, {
      follower_id: followerId,
      following_id: followingId,
    });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(error) };
  }

  return { ok: true, errorMessage: null };
}
