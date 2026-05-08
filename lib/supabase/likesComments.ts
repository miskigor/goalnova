/**
 * PitchRusch social tables (PostgREST → `public` schema by default):
 * - `public.likes`   (columns: user_id, video_id, …)
 * - `public.comments` (columns: user_id, video_id, content, …)
 *
 * All writes use `supabase.auth.getSession()` for `user_id` — never trust caller-supplied user ids.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";
import {
  scheduleVideoCommentNotification,
  scheduleVideoLikedNotification,
} from "@/lib/supabase/notifications";

export type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

function normalizeVideoId(videoId: string): string | null {
  const v = videoId?.trim();
  return v ? v : null;
}

/** Session fetch only. `userId` null + no error = guest (not signed in). */
async function getSessionUserId(
  supabase: SupabaseClient<Database>,
  label: string,
  context: Record<string, unknown>
): Promise<{ userId: string | null; sessionError: string | null }> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    logFullSupabaseError(`[PitchRusch] ${label} getSession`, sessionError, context);
    return { userId: null, sessionError: supabaseErrorToUserMessage(sessionError) };
  }

  return {
    userId: sessionData.session?.user?.id ?? null,
    sessionError: null,
  };
}

/** Requires a logged-in user (for writes). */
async function requireAuthedUserId(
  supabase: SupabaseClient<Database>,
  label: string,
  context: Record<string, unknown>
): Promise<{ userId: string | null; error: string | null }> {
  const { userId, sessionError } = await getSessionUserId(supabase, label, context);
  if (sessionError) {
    return { userId: null, error: sessionError };
  }
  if (!userId) {
    return { userId: null, error: "You must be signed in." };
  }
  return { userId, error: null };
}

export async function fetchLikeCount(
  supabase: SupabaseClient<Database>,
  videoId: string
): Promise<{ count: number; error: string | null }> {
  const vid = normalizeVideoId(videoId);
  if (!vid) {
    return { count: 0, error: "Missing video." };
  }

  const { count, error } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("video_id", vid);

  if (error) {
    logFullSupabaseError("[PitchRusch likes] fetchLikeCount", error, { video_id: vid });
    return { count: 0, error: supabaseErrorToUserMessage(error) };
  }
  return { count: count ?? 0, error: null };
}

export async function fetchCommentCount(
  supabase: SupabaseClient<Database>,
  videoId: string
): Promise<{ count: number; error: string | null }> {
  const vid = normalizeVideoId(videoId);
  if (!vid) {
    return { count: 0, error: "Missing video." };
  }

  const { count, error } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("video_id", vid);

  if (error) {
    logFullSupabaseError("[PitchRusch comments] fetchCommentCount", error, {
      video_id: vid,
    });
    return { count: 0, error: supabaseErrorToUserMessage(error) };
  }
  return { count: count ?? 0, error: null };
}

/** Uses session user id only (same as DB `user_id` for likes). */
export async function fetchUserHasLiked(
  supabase: SupabaseClient<Database>,
  videoId: string
): Promise<{ liked: boolean; error: string | null }> {
  const vid = normalizeVideoId(videoId);
  if (!vid) {
    return { liked: false, error: null };
  }

  const { userId: authId, sessionError } = await getSessionUserId(
    supabase,
    "fetchUserHasLiked",
    { video_id: vid }
  );
  if (sessionError) {
    return { liked: false, error: sessionError };
  }
  if (!authId) {
    return { liked: false, error: null };
  }

  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("video_id", vid)
    .eq("user_id", authId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[PitchRusch likes] fetchUserHasLiked", error, {
      video_id: vid,
      user_id: authId,
    });
    return { liked: false, error: supabaseErrorToUserMessage(error) };
  }
  return { liked: Boolean(data?.id), error: null };
}

/**
 * Like: insert into `public.likes`. Unlike: delete.
 * `user_id` is always the current session user. `video_id` is trimmed before use.
 */
export async function setVideoLiked(
  supabase: SupabaseClient<Database>,
  videoId: string,
  liked: boolean
): Promise<{ error: string | null }> {
  const vid = normalizeVideoId(videoId);
  if (!vid) {
    return { error: "Missing video." };
  }

  const { userId: authId, error: authErr } = await requireAuthedUserId(
    supabase,
    "setVideoLiked",
    { video_id: vid, liked }
  );
  if (authErr || !authId) {
    return { error: authErr ?? "You must be signed in." };
  }

  if (liked) {
    const { error } = await supabase.from("likes").insert({
      user_id: authId,
      video_id: vid,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { error: null };
      }
      logFullSupabaseError("[PitchRusch likes] setVideoLiked insert", error, {
        video_id: vid,
        user_id: authId,
      });
      return { error: supabaseErrorToUserMessage(error) };
    }
    scheduleVideoLikedNotification(supabase, vid, authId);
    return { error: null };
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("video_id", vid)
    .eq("user_id", authId);

  if (error) {
    logFullSupabaseError("[PitchRusch likes] setVideoLiked delete", error, {
      video_id: vid,
      user_id: authId,
    });
    return { error: supabaseErrorToUserMessage(error) };
  }
  return { error: null };
}

export async function fetchCommentsForVideo(
  supabase: SupabaseClient<Database>,
  videoId: string
): Promise<{ comments: CommentRow[]; error: string | null }> {
  const vid = normalizeVideoId(videoId);
  if (!vid) {
    return { comments: [], error: "Missing video." };
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("video_id", vid)
    .order("created_at", { ascending: false });

  if (error) {
    logFullSupabaseError("[PitchRusch comments] fetchCommentsForVideo", error, {
      video_id: vid,
    });
    return { comments: [], error: supabaseErrorToUserMessage(error) };
  }
  return { comments: (data ?? []) as CommentRow[], error: null };
}

/**
 * Inserts into `public.comments`: `user_id` from session, `video_id` trimmed, `content` trimmed.
 * Empty text is rejected before any database call.
 */
export async function insertComment(
  supabase: SupabaseClient<Database>,
  videoId: string,
  rawContent: string
): Promise<{ error: string | null }> {
  const content = rawContent.trim();
  if (!content) {
    return { error: "Comment cannot be empty." };
  }

  const vid = normalizeVideoId(videoId);
  if (!vid) {
    return { error: "Missing video." };
  }

  const { userId: authId, error: authErr } = await requireAuthedUserId(
    supabase,
    "insertComment",
    { video_id: vid, contentLength: content.length }
  );
  if (authErr || !authId) {
    return { error: authErr ?? "You must be signed in to comment." };
  }

  const payload = {
    user_id: authId,
    video_id: vid,
    content,
  };

  const { error } = await supabase.from("comments").insert(payload);

  if (error) {
    logFullSupabaseError("[PitchRusch comments] insertComment", error, {
      video_id: vid,
      user_id: authId,
      contentLength: content.length,
    });
    return { error: supabaseErrorToUserMessage(error) };
  }

  scheduleVideoCommentNotification(supabase, vid, authId);
  return { error: null };
}
