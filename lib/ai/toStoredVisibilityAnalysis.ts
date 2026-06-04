import type { Json } from "@/lib/supabase/database.types";
import type { VideoAnalysisScores, VideoAnalysisV2Stored } from "./types";

/** Serialize scores for `ai_analyses.visibility_analysis` jsonb. */
export function toStoredVisibilityAnalysis(
  scores: VideoAnalysisScores,
): Json | null {
  if (!scores.valid_for_football_analysis) return null;

  if (scores.v2) {
    const stored: VideoAnalysisV2Stored = {
      schema_version: 2,
      ...scores.v2,
      scout_visibility: scores.visibility_analysis,
    };
    return stored as unknown as Json;
  }

  return (scores.visibility_analysis ?? null) as Json | null;
}
