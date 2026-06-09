import type { Database } from "./database.types";
import { supabase } from "./client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "./logError";
import type { VideoAnalysisScores } from "@/lib/ai/types";
import { toStoredVisibilityAnalysis } from "@/lib/ai/toStoredVisibilityAnalysis";
import {
  publicAiScoreToMinimalRow,
  rpcFetchPublicAiScoresForVideos,
} from "@/lib/supabase/publicAiAnalyses";

export type AiAnalysisRow = Database["public"]["Tables"]["ai_analyses"]["Row"];

/**
 * Loads analysis for a video: full row when RLS allows (owner / video owner / scout / staff),
 * otherwise public-safe score projection via RPC (anon and other viewers).
 */
export async function fetchAiAnalysisForVideo(
  videoId: string,
): Promise<{ row: AiAnalysisRow | null; errorMessage: string | null }> {
  const vid = videoId.trim();
  if (!vid) return { row: null, errorMessage: null };

  const { data, error } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("video_id", vid)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[ai_analyses] fetchAiAnalysisForVideo privileged", error, {
      videoId: vid,
    });
  }

  if (data) {
    return { row: data, errorMessage: null };
  }

  const { rows, errorMessage } = await rpcFetchPublicAiScoresForVideos(supabase, [vid]);
  if (errorMessage) {
    return { row: null, errorMessage };
  }

  const safe = rows[0];
  if (!safe) {
    return { row: null, errorMessage: null };
  }

  return { row: publicAiScoreToMinimalRow(safe), errorMessage: null };
}

/**
 * One row per `video_id` (unique constraint `ai_analyses_video_id_key`).
 * Re-analyze → same `video_id` updates scores and `user_id` (last analyst).
 */
export async function upsertAiAnalysis(params: {
  userId: string;
  videoId: string;
  scores: VideoAnalysisScores;
}): Promise<{ row: AiAnalysisRow | null; errorMessage: string | null }> {
  const leg = params.scores.legacy;
  const v2 = params.scores.v2;
  const payload: Database["public"]["Tables"]["ai_analyses"]["Insert"] = {
    user_id: params.userId,
    video_id: params.videoId,
    speed: leg?.speed ?? v2?.scores.speed ?? null,
    technique: leg?.technique ?? v2?.scores.technique ?? null,
    decision_making:
      leg?.decision_making ?? v2?.scores.decision_making ?? null,
    agility: leg?.agility ?? v2?.scores.agility ?? null,
    shot_power: leg?.shot_power ?? v2?.scores.shooting ?? null,
    overall_score: params.scores.overall_score,
    feedback_text: params.scores.feedback_text,
    visibility_analysis: toStoredVisibilityAnalysis(params.scores),
    valid_for_football_analysis: params.scores.valid_for_football_analysis,
    clip_type: params.scores.clip_type,
    invalid_reason: params.scores.invalid_reason,
  };

  const { data, error } = await supabase
    .from("ai_analyses")
    .upsert(payload, { onConflict: "video_id" })
    .select("*")
    .single();

  if (error) {
    logFullSupabaseError("[ai_analyses] upsertAiAnalysis", error, {
      userId: params.userId,
      videoId: params.videoId,
      onConflict: "video_id",
      dbConstraint: "ai_analyses_video_id_key",
    });
    return { row: null, errorMessage: supabaseErrorToUserMessage(error) };
  }

  return { row: data ?? null, errorMessage: null };
}
