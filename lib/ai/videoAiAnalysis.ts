import type { VideoAnalysisScores } from "./types";
import {
  normalizeVisibilityPayload,
  normalizeV2StoredPayload,
  overallFromAssessableMetrics,
} from "./visibilityAnalysis";
import {
  fetchAiAnalysisForVideo,
  upsertAiAnalysis,
  type AiAnalysisRow,
} from "@/lib/supabase/aiAnalyses";

export type { AiAnalysisRow };

/** Map DB row → UI scores shape (reusable for any consumer). */
export function mapAiAnalysisRowToScores(row: AiAnalysisRow): VideoAnalysisScores {
  const validForFootball = row.valid_for_football_analysis !== false;
  const v2Stored = normalizeV2StoredPayload(row.visibility_analysis);

  if (!validForFootball) {
    return {
      valid_for_football_analysis: false,
      clip_type: row.clip_type ?? "non_football",
      invalid_reason: row.invalid_reason,
      overall_score: row.overall_score ?? 0,
      overall_confidence: 0,
      feedback_text: row.feedback_text,
      visibility_analysis: null,
      legacy: null,
      v2: null,
    };
  }

  if (v2Stored) {
    const va =
      v2Stored.scout_visibility ??
      normalizeVisibilityPayload(row.visibility_analysis);
    const overall_confidence = Math.min(
      1,
      Math.max(0, v2Stored.confidence / 100),
    );
    return {
      valid_for_football_analysis: true,
      clip_type: row.clip_type ?? va?.clip_type ?? null,
      invalid_reason: null,
      overall_score: row.overall_score,
      overall_confidence,
      feedback_text:
        v2Stored.player_friendly_summary || row.feedback_text,
      visibility_analysis: va,
      legacy: null,
      v2: {
        confidence: v2Stored.confidence,
        scores: v2Stored.scores,
        strengths: v2Stored.strengths,
        improvements: v2Stored.improvements,
        badges: v2Stored.badges,
        coach_feedback: v2Stored.coach_feedback,
        player_friendly_summary: v2Stored.player_friendly_summary,
        weekly_training_plan: v2Stored.weekly_training_plan,
      },
    };
  }

  const va = normalizeVisibilityPayload(row.visibility_analysis);
  if (va) {
    const derived = overallFromAssessableMetrics(va.metrics);
    const overall_confidence =
      typeof va.overall_confidence === "number"
        ? Math.min(1, Math.max(0, va.overall_confidence))
        : derived.overall_confidence;
    return {
      valid_for_football_analysis: true,
      clip_type: row.clip_type ?? va.clip_type ?? null,
      invalid_reason: null,
      overall_score: row.overall_score,
      overall_confidence,
      feedback_text: row.feedback_text,
      visibility_analysis: va,
      legacy: null,
      v2: null,
    };
  }

  const hasLegacy =
    row.speed != null ||
    row.technique != null ||
    row.decision_making != null ||
    row.agility != null ||
    row.shot_power != null;

  if (hasLegacy) {
    return {
      valid_for_football_analysis: true,
      clip_type: row.clip_type,
      invalid_reason: null,
      overall_score: row.overall_score,
      overall_confidence: 0.72,
      feedback_text: row.feedback_text,
      visibility_analysis: null,
      legacy: {
        speed: Number(row.speed ?? 0),
        technique: Number(row.technique ?? 0),
        decision_making: Number(row.decision_making ?? 0),
        agility: Number(row.agility ?? 0),
        shot_power: Number(row.shot_power ?? 0),
      },
      v2: null,
    };
  }

  return {
    valid_for_football_analysis: true,
    clip_type: row.clip_type,
    invalid_reason: null,
    overall_score: row.overall_score,
    overall_confidence: 0.55,
    feedback_text: row.feedback_text,
    visibility_analysis: null,
    legacy: null,
    v2: null,
  };
}

/**
 * Load saved analysis from `public.ai_analyses` only (one row per `video_id`).
 * Does not call any AI provider — safe to run on every modal open.
 */
export async function fetchPersistedVideoAiAnalysis(videoId: string) {
  return fetchAiAnalysisForVideo(videoId);
}

/**
 * Insert or replace the row for `(user_id, video_id)` (unique in DB).
 * Call only after a new provider run; keeps a single current result per clip.
 */
export async function upsertPersistedVideoAiAnalysis(params: {
  userId: string;
  videoId: string;
  scores: VideoAnalysisScores;
}) {
  return upsertAiAnalysis(params);
}
