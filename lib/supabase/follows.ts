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
 * Loads follower and following counts via safe RPC (anon + authenticated).
 */
export async function fetchFollowCountsForUser(
  userId: string
): Promise<FollowCountsResult> {
  const uid = userId.trim();
  if (!uid) {
    return {
      followers: 0,
      following: 0,
      followersError: null,
      followingError: null,
    };
  }

  const { data, error } = await supabase.rpc("goalnova_public_follow_counts", {
    p_user_id: uid,
  });

  if (error) {
    logFullSupabaseError("Follows: public follow counts RPC", error, {
      user_id: uid,
    });
    const message = supabaseErrorToUserMessage(error);
    return {
      followers: null,
      following: null,
      followersError: message,
      followingError: message,
    };
  }

  const row = Array.isArray(data) ? data[0] : null;
  return {
    followers: row?.followers_count ?? 0,
    following: row?.following_count ?? 0,
    followersError: null,
    followingError: null,
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
