import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AiAnalysisRow } from "@/lib/supabase/aiAnalyses";
import { logFullSupabaseError, supabaseErrorToUserMessage } from "@/lib/supabase/logError";

export type PublicAiScoreRpcRow = {
  video_id: string;
  overall_score: number | null;
  created_at: string | null;
  valid_for_football_analysis: boolean | null;
};

type Client = SupabaseClient<Database>;

/** Minimal row for public UI (overall score only; no private analysis fields). */
export function publicAiScoreToMinimalRow(safe: PublicAiScoreRpcRow): AiAnalysisRow {
  const valid = safe.valid_for_football_analysis !== false;
  return {
    id: "",
    user_id: "",
    video_id: safe.video_id,
    speed: null,
    technique: null,
    decision_making: null,
    agility: null,
    shot_power: null,
    overall_score: Number(safe.overall_score) || 0,
    feedback_text: "",
    visibility_analysis: null,
    valid_for_football_analysis: valid,
    clip_type: null,
    invalid_reason: null,
    created_at: safe.created_at ?? new Date(0).toISOString(),
  };
}

export async function rpcFetchPublicAiScoresForVideos(
  client: Client,
  videoIds: string[],
): Promise<{ rows: PublicAiScoreRpcRow[]; errorMessage: string | null }> {
  const ids = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { rows: [], errorMessage: null };

  const { data, error } = await client.rpc("goalnova_public_ai_scores_for_videos", {
    p_video_ids: ids,
  });

  if (error) {
    logFullSupabaseError("[publicAiAnalyses] scores for videos", error, {
      count: ids.length,
    });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(error) };
  }

  return { rows: (data ?? []) as PublicAiScoreRpcRow[], errorMessage: null };
}

export async function rpcFetchPublicTopRatedAiVideos(
  client: Client,
  limit = 180,
): Promise<{ rows: PublicAiScoreRpcRow[]; errorMessage: string | null }> {
  const { data, error } = await client.rpc("goalnova_public_top_rated_ai_videos", {
    p_limit: limit,
  });

  if (error) {
    logFullSupabaseError("[publicAiAnalyses] top rated", error, { limit });
    return { rows: [], errorMessage: supabaseErrorToUserMessage(error) };
  }

  return { rows: (data ?? []) as PublicAiScoreRpcRow[], errorMessage: null };
}

/** Build video_id → overall_score map from safe RPC rows. */
export function publicAiScoresToMap(rows: PublicAiScoreRpcRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.valid_for_football_analysis === false) continue;
    const score = Number(row.overall_score);
    if (typeof row.video_id === "string" && row.video_id.length > 0 && Number.isFinite(score)) {
      map.set(row.video_id, score);
    }
  }
  return map;
}
