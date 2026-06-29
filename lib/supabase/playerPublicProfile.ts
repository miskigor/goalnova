import type { Database } from "./client";
import { supabase } from "./client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "./logError";
import { PROFILE_GRID_VIDEO_COLUMNS } from "@/lib/video/videoListColumns";
import {
  normalizePlayerProfileSlug,
  rpcResolvePublicPlayerProfileBySlug,
  type PlayerProfileRow,
} from "@/lib/supabase/publicPlayerProfiles";

export type { PlayerProfileRow };
export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];

/** Loose UUID v4-style check for routing (id vs username). */
export function isUuidLike(value: string): boolean {
  const s = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

export async function fetchPlayerProfileBySlug(
  slug: string
): Promise<{
  profile: PlayerProfileRow | null;
  /** Canonical avatar from `public.users.avatar_url`. */
  userAvatarUrl: string | null;
  errorMessage: string | null;
}> {
  const trimmed = normalizePlayerProfileSlug(slug);
  if (!trimmed) {
    return { profile: null, userAvatarUrl: null, errorMessage: null };
  }

  const { row: profile, errorMessage } = await rpcResolvePublicPlayerProfileBySlug(
    supabase,
    trimmed,
  );

  if (errorMessage) {
    logFullSupabaseError(
      "playerPublicProfile: fetchPlayerProfileBySlug",
      new Error(errorMessage),
      { slug: trimmed, byId: isUuidLike(trimmed) },
    );
    return { profile: null, userAvatarUrl: null, errorMessage };
  }
  if (profile?.id) {
    const profileAvatar =
      typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";

    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("id,is_deleted,avatar_url")
      .eq("id", profile.id)
      .maybeSingle();

    if (uErr) {
      logFullSupabaseError("playerPublicProfile: users by id", uErr, {
        userId: profile.id,
      });
      return {
        profile,
        userAvatarUrl: profileAvatar || null,
        errorMessage: null,
      };
    }

    if (u?.is_deleted) {
      return { profile: null, userAvatarUrl: null, errorMessage: null };
    }

    const avatar = typeof u?.avatar_url === "string" ? u.avatar_url.trim() : "";
    return {
      profile,
      userAvatarUrl: avatar || profileAvatar || null,
      errorMessage: null,
    };
  }

  return { profile, userAvatarUrl: null, errorMessage: null };
}

export async function fetchVideosForPlayer(
  userId: string
): Promise<{ videos: VideoRow[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("videos")
    .select(PROFILE_GRID_VIDEO_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logFullSupabaseError("playerPublicProfile: fetchVideosForPlayer", error, {
      userId,
    });
    return {
      videos: [],
      errorMessage: supabaseErrorToUserMessage(error),
    };
  }

  return { videos: (data ?? []) as VideoRow[], errorMessage: null };
}

/**
 * Delete a single video by id.
 * Ownership is enforced by Supabase RLS policies.
 */
export async function deleteOwnVideoById(
  videoId: string
): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const vid = videoId.trim();
  if (!vid) {
    return { ok: false, errorMessage: "Invalid video id." };
  }
  const { data, error } = await supabase
    .from("videos")
    .delete()
    .eq("id", vid)
    .select("id");
  if (error) {
    logFullSupabaseError("playerPublicProfile: deleteOwnVideoById", error, {
      videoId: vid,
    });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(error) };
  }
  if (!data?.length) {
    return {
      ok: false,
      errorMessage:
        "Could not delete video. It may still have linked likes or comments.",
    };
  }
  return { ok: true };
}
