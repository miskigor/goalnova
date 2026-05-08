import type { Database } from "./database.types";
import { supabase } from "./client";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "./logError";
import type { VideoAnalysisScores } from "@/lib/ai/types";

export type AiAnalysisRow = Database["public"]["Tables"]["ai_analyses"]["Row"];

/** Loads the single analysis row for this video (unique `video_id` in DB). RLS still applies. */
export async function fetchAiAnalysisForVideo(
  videoId: string,
): Promise<{ row: AiAnalysisRow | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("video_id", videoId)
    .maybeSingle();

  if (error) {
    logFullSupabaseError("[ai_analyses] fetchAiAnalysisForVideo", error, {
      videoId,
    });
    return { row: null, errorMessage: supabaseErrorToUserMessage(error) };
  }

  return { row: data ?? null, errorMessage: null };
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
  const payload: Database["public"]["Tables"]["ai_analyses"]["Insert"] = {
    user_id: params.userId,
    video_id: params.videoId,
    speed: leg?.speed ?? null,
    technique: leg?.technique ?? null,
    decision_making: leg?.decision_making ?? null,
    agility: leg?.agility ?? null,
    shot_power: leg?.shot_power ?? null,
    overall_score: params.scores.overall_score,
    feedback_text: params.scores.feedback_text,
    visibility_analysis: params.scores.visibility_analysis,
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
