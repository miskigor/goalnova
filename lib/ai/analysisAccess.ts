import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

export async function userIsPremium(
  client: Db,
  userId: string,
): Promise<boolean> {
  const { data } = await client
    .from("users")
    .select("is_premium")
    .eq("id", userId)
    .maybeSingle();
  return data?.is_premium === true;
}

export async function userCanRunScoutAiInsight(
  client: Db,
  userId: string,
): Promise<boolean> {
  const { data } = await client
    .from("users")
    .select("role, scout_verification_status")
    .eq("id", userId)
    .maybeSingle();

  const role = (data?.role ?? "").toLowerCase();
  if (role === "admin" || role === "staff" || role === "super_admin") {
    return true;
  }
  if (role !== "scout") return false;
  return data?.scout_verification_status === "approved";
}

export async function assertVideoAiAnalyzeAccess(params: {
  client: Db;
  userId: string;
  videoId: string;
  scoutInsight: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: video, error } = await params.client
    .from("videos")
    .select("id, user_id")
    .eq("id", params.videoId)
    .maybeSingle();

  if (error || !video) return { ok: false, error: "video_not_found" };

  const ownerId = video.user_id?.trim() ?? "";
  const isOwner = ownerId === params.userId;

  if (params.scoutInsight) {
    const scoutOk = await userCanRunScoutAiInsight(params.client, params.userId);
    if (!scoutOk) return { ok: false, error: "scout_access_denied" };
    return { ok: true };
  }

  if (!isOwner) return { ok: false, error: "not_video_owner" };

  const premium = await userIsPremium(params.client, params.userId);
  if (!premium) return { ok: false, error: "premium_required" };

  return { ok: true };
}
