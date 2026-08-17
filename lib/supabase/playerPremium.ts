import { supabase } from "@/lib/supabase/client";
import { canSetFeaturedVideo, isPlayerPremium } from "@/lib/premium/playerPremium";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

type MyPremiumProfile = {
  id: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  profile_completeness: number | null;
  ai_overall_score: number | null;
};

export type PlayerProfileStatsRow = {
  profile_views: number | null;
  video_views: number | null;
  scout_saves: number | null;
  scout_contacts: number | null;
};

function isMissingPlayerProfilesColumnError(error: unknown): boolean {
  const e = error as { code?: string | null; message?: string | null } | null;
  if (e?.code !== "42703") return false;
  const message = String(e?.message ?? "").toLowerCase();
  return message.includes("player_profiles");
}

export async function fetchMyPlayerPremiumProfile(): Promise<{
  profile: MyPremiumProfile | null;
  errorMessage: string | null;
}> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { profile: null, errorMessage: "Not signed in." };

  const { data, error } = await supabase
    .from("player_profiles")
    .select("id,subscription_plan,subscription_status,subscription_current_period_end,profile_completeness,ai_overall_score")
    .eq("id", uid)
    .maybeSingle();
  if (error) {
    if (isMissingPlayerProfilesColumnError(error)) {
      const fallback = await supabase
        .from("player_profiles")
        .select("id,subscription_plan,subscription_status")
        .eq("id", uid)
        .maybeSingle();
      if (fallback.error) {
        logFullSupabaseError("[player premium] fetchMyPlayerPremiumProfile fallback", fallback.error, {
          uid,
        });
        return { profile: null, errorMessage: supabaseErrorToUserMessage(fallback.error) };
      }
      if (!fallback.data) return { profile: null, errorMessage: null };
      return {
        profile: {
          id: String(fallback.data.id),
          subscription_plan: fallback.data.subscription_plan ?? null,
          subscription_status: fallback.data.subscription_status ?? null,
          subscription_current_period_end: null,
          profile_completeness: null,
          ai_overall_score: null,
        },
        errorMessage: null,
      };
    }
    logFullSupabaseError("[player premium] fetchMyPlayerPremiumProfile", error, { uid });
    return { profile: null, errorMessage: supabaseErrorToUserMessage(error) };
  }
  return { profile: (data as MyPremiumProfile | null) ?? null, errorMessage: null };
}

export async function fetchMyVideoCount(): Promise<{ count: number; errorMessage: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { count: 0, errorMessage: "Not signed in." };
  const { count, error } = await supabase
    .from("videos")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", uid);
  if (error) {
    logFullSupabaseError("[player premium] fetchMyVideoCount", error, { uid });
    return { count: 0, errorMessage: supabaseErrorToUserMessage(error) };
  }
  return { count: count ?? 0, errorMessage: null };
}

export async function setFeaturedVideo(videoId: string): Promise<{ ok: boolean; errorMessage: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, errorMessage: "Not signed in." };

  const { profile, errorMessage } = await fetchMyPlayerPremiumProfile();
  if (errorMessage) return { ok: false, errorMessage };
  if (!canSetFeaturedVideo(profile) || !isPlayerPremium(profile)) {
    return { ok: false, errorMessage: "Featured Video is available in Player Premium." };
  }

  const { data: ownedVideo, error: ownErr } = await supabase
    .from("videos")
    .select("id,user_id")
    .eq("id", videoId)
    .eq("user_id", uid)
    .maybeSingle();
  if (ownErr || !ownedVideo) {
    if (ownErr) {
      logFullSupabaseError("[player premium] setFeaturedVideo ownership", ownErr, { uid, videoId });
      return { ok: false, errorMessage: supabaseErrorToUserMessage(ownErr) };
    }
    return { ok: false, errorMessage: "Video not found." };
  }

  const { error: resetErr } = await supabase
    .from("videos")
    .update({ is_featured: false })
    .eq("user_id", uid);
  if (resetErr) {
    logFullSupabaseError("[player premium] setFeaturedVideo reset", resetErr, { uid });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(resetErr) };
  }
  const { error: setErr } = await supabase
    .from("videos")
    .update({ is_featured: true })
    .eq("id", videoId)
    .eq("user_id", uid);
  if (setErr) {
    logFullSupabaseError("[player premium] setFeaturedVideo set", setErr, { uid, videoId });
    return { ok: false, errorMessage: supabaseErrorToUserMessage(setErr) };
  }
  return { ok: true, errorMessage: null };
}

export async function fetchMyPlayerProfileStats(): Promise<{
  stats: PlayerProfileStatsRow | null;
  errorMessage: string | null;
}> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { stats: null, errorMessage: "Not signed in." };
  const { data, error } = await supabase
    .from("player_profile_stats")
    .select("profile_views,video_views,scout_saves,scout_contacts")
    .eq("player_id", uid)
    .maybeSingle();
  if (error) {
    logFullSupabaseError("[player premium] fetchMyPlayerProfileStats", error, { uid });
    return { stats: null, errorMessage: supabaseErrorToUserMessage(error) };
  }
  return { stats: (data as PlayerProfileStatsRow | null) ?? null, errorMessage: null };
}
