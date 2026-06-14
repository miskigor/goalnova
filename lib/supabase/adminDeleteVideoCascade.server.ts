import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const DEPENDENT_TABLES = [
  "likes",
  "comments",
  "challenge_entries",
  "challenge_winners",
  "scout_ai_insight_events",
  "ai_analyses",
  "weekly_challenge_submissions",
] as const;

type DependentTable = (typeof DEPENDENT_TABLES)[number];

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table")
  );
}

/**
 * Remove a video and rows that reference it. Service role only.
 */
export async function deleteVideoCascadeServer(
  service: SupabaseClient<Database>,
  videoId: string,
): Promise<
  | { ok: true; ownerUserId: string }
  | { ok: false; reason: "not_found" | "delete_failed"; message?: string }
> {
  const { data: video, error: loadErr } = await service
    .from("videos")
    .select("id, user_id")
    .eq("id", videoId)
    .maybeSingle();

  if (loadErr) {
    return { ok: false, reason: "delete_failed", message: loadErr.message };
  }
  if (!video?.id) {
    return { ok: false, reason: "not_found" };
  }

  for (const table of DEPENDENT_TABLES) {
    const { error } = await service
      .from(table as DependentTable)
      .delete()
      .eq("video_id", videoId);
    if (error && !isMissingTableError(error)) {
      return { ok: false, reason: "delete_failed", message: `${table}: ${error.message}` };
    }
  }

  const { data: deleted, error: deleteErr } = await service
    .from("videos")
    .delete()
    .eq("id", videoId)
    .select("id");

  if (deleteErr) {
    return { ok: false, reason: "delete_failed", message: deleteErr.message };
  }
  if (!deleted?.length) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, ownerUserId: video.user_id };
}
