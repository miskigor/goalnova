import type { Database } from "./client";
import { supabase } from "./client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "./logError";

export type PlayerProfileRow =
  Database["public"]["Tables"]["player_profiles"]["Row"];
export type VideoRow = Database["public"]["Tables"]["videos"]["Row"];

/** Loose UUID v4-style check for routing (id vs username). */
export function isUuidLike(value: string): boolean {
  const s = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s
  );
}

function escapeIlikeExact(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export async function fetchPlayerProfileBySlug(
  slug: string
): Promise<{
  profile: PlayerProfileRow | null;
  /** Canonical avatar from `public.users.avatar_url`. */
  userAvatarUrl: string | null;
  errorMessage: string | null;
}> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { profile: null, userAvatarUrl: null, errorMessage: null };
  }

  let query = supabase.from("player_profiles").select("*");

  if (isUuidLike(trimmed)) {
    query = query.eq("id", trimmed);
  } else {
    query = query.ilike("username", escapeIlikeExact(trimmed));
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    logFullSupabaseError("playerPublicProfile: fetchPlayerProfileBySlug", error, {
      slug: trimmed,
      byId: isUuidLike(trimmed),
    });
    return {
      profile: null,
      userAvatarUrl: null,
      errorMessage: supabaseErrorToUserMessage(error),
    };
  }

  const profile = data ?? null;
  if (profile?.id) {
    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("id,is_deleted,avatar_url")
      .eq("id", profile.id)
      .maybeSingle();
    if (uErr) {
      logFullSupabaseError("playerPublicProfile: users by id", uErr, {
        userId: profile.id,
      });
      return { profile: null, userAvatarUrl: null, errorMessage: supabaseErrorToUserMessage(uErr) };
    }
    if (u?.is_deleted) {
      return { profile: null, userAvatarUrl: null, errorMessage: null };
    }
    const avatar = typeof u?.avatar_url === "string" ? u.avatar_url.trim() : "";
    const profileAvatar =
      typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";
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
    .select("*")
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

  return { videos: data ?? [], errorMessage: null };
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
  const { error } = await supabase.from("videos").delete().eq("id", vid);
  if (error) {
    logFullSupabaseError("playerPublicProfile: deleteOwnVideoById", error, {
      videoId: vid,
    });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(error) };
  }
  return { ok: true };
}
